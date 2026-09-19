import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../models/concierge.dart';
import '../../models/models.dart';
import '../../providers/auth_controller.dart';
import '../../providers/cart_controller.dart';
import '../../router/app_router.dart';
import '../../theme/app_theme.dart';
import '../../utils/media_url.dart';
import '../../utils/user_facing_error.dart';

final _confirmRe = RegExp(
  r'^(yes|yep|yeah|ok|okay|sure|confirm|book it|book them|add them|add it|do it|go ahead|please book|please add)[\s!.]*$',
  caseSensitive: false,
);

const _suggestions = <(String, String)>[
  ('What cars do I have?', 'What cars do I have?'),
  ('Next service', 'When is my next service?'),
  ('Oil filter', 'Find an oil filter for my car'),
  ('Book oil service', 'Book an oil service'),
];

class ConciergeScreen extends StatefulWidget {
  const ConciergeScreen({super.key, this.vehicleId});

  final String? vehicleId;

  @override
  State<ConciergeScreen> createState() => _ConciergeScreenState();
}

class _ChatLine {
  const _ChatLine({required this.role, required this.text, this.actDone = false});
  final String role;
  final String text;
  final bool actDone;
}

class _ConciergeScreenState extends State<ConciergeScreen> {
  final _api = BuyerApi(ApiClient());
  final _input = TextEditingController();
  final _location = TextEditingController();
  final _phone = TextEditingController();
  final _scroll = ScrollController();
  final List<_ChatLine> _messages = [];
  ConciergePendingAction? _pending;
  bool _busy = false;
  String? _error;
  bool _needLocation = false;
  bool _needPhone = false;
  final _money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _input.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _input.dispose();
    _location.dispose();
    _phone.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send([String? preset]) async {
    final text = (preset ?? _input.text).trim();
    if (text.isEmpty || _busy) return;
    if (_pending != null && _confirmRe.hasMatch(text)) {
      _input.clear();
      await _confirm();
      return;
    }
    _input.clear();
    setState(() {
      _messages.add(_ChatLine(role: 'user', text: text));
      _busy = true;
      _error = null;
    });
    _jump();
    try {
      final customerId = context.read<AuthController>().customerId;
      final result = await _api.chatConcierge({
        if (customerId != null) 'customerId': customerId,
        if (widget.vehicleId != null && widget.vehicleId!.isNotEmpty) 'vehicleId': widget.vehicleId,
        'message': text,
        'history': _messages.map((m) => {'role': m.role, 'content': m.text}).toList(),
      });
      if (!mounted) return;
      setState(() {
        _messages.add(_ChatLine(role: 'assistant', text: result.reply));
        _pending = result.pendingAction;
        _busy = false;
        if (!result.configured) {
          _error = 'Concierge is not configured yet. Add GROK_API_KEY on the server.';
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = userFacingError(e, fallback: 'Could not reach concierge.');
      });
    }
    _jump();
  }

  Future<void> _confirm() async {
    final pending = _pending;
    if (pending == null || _busy) return;
    if (pending.isBook) {
      final ok = await ensureSignedIn(context);
      if (!ok || !mounted) return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final customerId = context.read<AuthController>().customerId;
      final result = await _api.actConcierge({
        if (customerId != null) 'customerId': customerId,
        'action': pending.toJson(),
        if (_location.text.trim().isNotEmpty) 'location': _location.text.trim(),
        if (_phone.text.trim().isNotEmpty) 'phone': _phone.text.trim(),
      });
      if (!mounted) return;
      if (!result.ok) {
        setState(() {
          _busy = false;
          _error = result.error ?? 'Could not complete that action.';
          _needLocation = result.field == 'location';
          _needPhone = result.field == 'phone';
        });
        if (result.field == 'sign_in') {
          await ensureSignedIn(context);
        }
        return;
      }
      if (result.type == 'quote') {
        final cart = context.read<CartController>();
        for (final line in result.lines) {
          await cart.add(
            Product(
              id: line.productId,
              name: line.name,
              description: '',
              price: line.price,
              image: line.image,
              category: '',
              brand: '',
            ),
            quantity: line.quantity,
          );
        }
        if (!mounted) return;
        setState(() {
          _pending = null;
          _busy = false;
          _messages.add(const _ChatLine(role: 'assistant', text: 'Added those parts to your cart.', actDone: true));
        });
      } else if (result.requestId != null) {
        setState(() {
          _pending = null;
          _busy = false;
        });
        if (!mounted) return;
        context.go('/service/requesting?requestId=${Uri.encodeComponent(result.requestId!)}');
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = userFacingError(e, fallback: 'Could not complete that action.');
      });
    }
    _jump();
  }

  void _clear() {
    setState(() {
      _messages.clear();
      _pending = null;
      _error = null;
      _needLocation = false;
      _needPhone = false;
    });
  }

  void _jump() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent + 80,
        duration: const Duration(milliseconds: 240),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final canSend = !_busy && _input.text.trim().isNotEmpty;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        titleSpacing: 16,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Concierge',
              style: AppTheme.host(fontSize: 18, fontWeight: FontWeight.w700, letterSpacing: -0.3),
            ),
            Text(
              'Online · garage, parts, bookings',
              style: AppTheme.host(fontSize: 12, color: AppColors.textMuted),
            ),
          ],
        ),
        actions: [
          if (_messages.isNotEmpty)
            IconButton(
              tooltip: 'Clear chat',
              onPressed: _clear,
              icon: const Icon(Icons.delete_outline),
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              controller: _scroll,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
              children: [
                if (_messages.isEmpty) _EmptyState(onPick: _send),
                ..._messages.map((m) => _Bubble(line: m, onOpenCart: () => context.go('/cart'))),
                if (_pending?.isQuote == true) _QuoteCard(pending: _pending!, money: _money, busy: _busy, onConfirm: _confirm),
                if (_pending?.isBook == true)
                  _BookCard(
                    pending: _pending!,
                    busy: _busy,
                    needLocation: _needLocation,
                    needPhone: _needPhone,
                    location: _location,
                    phone: _phone,
                    onConfirm: _confirm,
                  ),
                if (_busy)
                  const Padding(
                    padding: EdgeInsets.only(top: 8, left: 4),
                    child: _TypingDots(),
                  ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 10),
                    child: Text(_error!, style: AppTheme.host(color: AppColors.danger, fontSize: 13)),
                  ),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
              decoration: BoxDecoration(
                color: AppColors.surface,
                border: Border(top: BorderSide(color: AppColors.border.withValues(alpha: 0.9))),
              ),
              child: Column(
                children: [
                  if (_messages.isNotEmpty) _SuggestionRow(onPick: _send, enabled: !_busy),
                  if (_messages.isNotEmpty) const SizedBox(height: 10),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Container(
                          decoration: BoxDecoration(
                            color: AppColors.background,
                            borderRadius: BorderRadius.circular(22),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: TextField(
                            controller: _input,
                            minLines: 1,
                            maxLines: 4,
                            textInputAction: TextInputAction.send,
                            onSubmitted: (_) => _send(),
                            decoration: const InputDecoration(
                              hintText: 'Ask anything about your car…',
                              filled: true,
                              fillColor: Colors.transparent,
                              contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Material(
                        color: canSend ? AppColors.primary : AppColors.primarySoft,
                        shape: const CircleBorder(),
                        child: IconButton(
                          onPressed: canSend ? () => _send() : null,
                          icon: Icon(
                            Icons.send_rounded,
                            color: canSend ? AppColors.onPrimary : AppColors.textMuted,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SuggestionRow extends StatelessWidget {
  const _SuggestionRow({required this.onPick, this.enabled = true});
  final Future<void> Function([String? prompt]) onPick;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _suggestions.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final item = _suggestions[index];
          return ActionChip(
            label: Text(item.$1),
            onPressed: enabled ? () => onPick(item.$2) : null,
            backgroundColor: AppColors.surface,
            side: const BorderSide(color: AppColors.border),
            visualDensity: VisualDensity.compact,
            labelStyle: AppTheme.host(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primaryDeep),
          );
        },
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onPick});
  final Future<void> Function([String? prompt]) onPick;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadii.xxl),
        border: Border.all(color: AppColors.borderSoft),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.primarySoft,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.auto_awesome, color: AppColors.primary),
          ),
          const SizedBox(height: 14),
          Text('Hi — how can I help?', style: AppTheme.host(fontSize: 17, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(
            'Ask about your car, find a part, or book a mechanic. I will keep it short and clear.',
            style: AppTheme.host(fontSize: 14, color: AppColors.textSecondary, height: 1.4),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final item in _suggestions)
                ActionChip(
                  label: Text(item.$1),
                  onPressed: () => onPick(item.$2),
                  backgroundColor: AppColors.surface,
                  side: const BorderSide(color: AppColors.border),
                  labelStyle: AppTheme.host(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primaryDeep),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.line, required this.onOpenCart});
  final _ChatLine line;
  final VoidCallback onOpenCart;

  @override
  Widget build(BuildContext context) {
    final mine = line.role == 'user';
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: mine ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!mine) ...[
            Container(
              width: 28,
              height: 28,
              margin: const EdgeInsets.only(right: 8, bottom: 2),
              decoration: const BoxDecoration(
                color: AppColors.primarySoft,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.auto_awesome, size: 14, color: AppColors.primary),
            ),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.78),
              decoration: BoxDecoration(
                color: mine ? AppColors.primary : AppColors.surface,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(20),
                  topRight: const Radius.circular(20),
                  bottomLeft: Radius.circular(mine ? 20 : 6),
                  bottomRight: Radius.circular(mine ? 6 : 20),
                ),
                border: mine ? null : Border.all(color: AppColors.borderSoft),
                boxShadow: AppTheme.cardShadow,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    line.text,
                    style: AppTheme.host(
                      fontSize: 15,
                      height: 1.35,
                      color: mine ? AppColors.onPrimary : AppColors.textPrimary,
                    ),
                  ),
                  if (line.actDone && line.text.toLowerCase().contains('cart'))
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: GestureDetector(
                        onTap: onOpenCart,
                        child: Text(
                          'View cart',
                          style: AppTheme.host(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: mine ? AppColors.onPrimary : AppColors.primaryDeep,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _QuoteCard extends StatelessWidget {
  const _QuoteCard({
    required this.pending,
    required this.money,
    required this.busy,
    required this.onConfirm,
  });

  final ConciergePendingAction pending;
  final NumberFormat money;
  final bool busy;
  final VoidCallback onConfirm;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 4, bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadii.xl),
        border: Border.all(color: AppColors.border),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Add to cart', style: AppTheme.host(fontWeight: FontWeight.w700, fontSize: 16)),
                Text('Confirm and I will drop these in your cart.', style: AppTheme.host(fontSize: 12, color: AppColors.textMuted)),
              ],
            ),
          ),
          for (final line in pending.lines)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 6),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: SizedBox(
                      width: 48,
                      height: 48,
                      child: line.image.isEmpty
                          ? const ColoredBox(
                              color: AppColors.surfaceMuted,
                              child: Icon(Icons.inventory_2_outlined, color: AppColors.textMuted, size: 20),
                            )
                          : Image.network(
                              resolveMediaUrl(line.image),
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stack) => const ColoredBox(color: AppColors.surfaceMuted),
                            ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(line.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppTheme.host(fontWeight: FontWeight.w600)),
                        Text('Qty ${line.quantity}', style: AppTheme.host(fontSize: 12, color: AppColors.textMuted)),
                      ],
                    ),
                  ),
                  Text(money.format(line.price * line.quantity), style: AppTheme.host(fontWeight: FontWeight.w700, color: AppColors.primaryDeep)),
                ],
              ),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: ElevatedButton(
              onPressed: busy ? null : onConfirm,
              style: ElevatedButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
              ),
              child: const Text('Confirm quote'),
            ),
          ),
        ],
      ),
    );
  }
}

class _BookCard extends StatelessWidget {
  const _BookCard({
    required this.pending,
    required this.busy,
    required this.needLocation,
    required this.needPhone,
    required this.location,
    required this.phone,
    required this.onConfirm,
  });

  final ConciergePendingAction pending;
  final bool busy;
  final bool needLocation;
  final bool needPhone;
  final TextEditingController location;
  final TextEditingController phone;
  final VoidCallback onConfirm;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 4, bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadii.xl),
        border: Border.all(color: AppColors.border),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: AppColors.primarySoft, borderRadius: BorderRadius.circular(14)),
                child: const Icon(Icons.build_outlined, color: AppColors.primaryDeep),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Book service', style: AppTheme.host(fontWeight: FontWeight.w700, fontSize: 16)),
                    Text(pending.service, style: AppTheme.host(color: AppColors.textSecondary)),
                  ],
                ),
              ),
            ],
          ),
          if (pending.location.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(pending.location, style: AppTheme.host(fontSize: 13, color: AppColors.textMuted)),
            ),
          if (needLocation)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: TextField(controller: location, decoration: const InputDecoration(labelText: 'Area or address')),
            ),
          if (needPhone)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: TextField(
                controller: phone,
                decoration: const InputDecoration(labelText: 'Mobile number'),
                keyboardType: TextInputType.phone,
              ),
            ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: busy ? null : onConfirm,
              style: ElevatedButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
              ),
              child: const Text('Confirm booking'),
            ),
          ),
        ],
      ),
    );
  }
}

class _TypingDots extends StatefulWidget {
  const _TypingDots();

  @override
  State<_TypingDots> createState() => _TypingDotsState();
}

class _TypingDotsState extends State<_TypingDots> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (context, child) {
        return Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(18),
                boxShadow: AppTheme.cardShadow,
              ),
              child: Row(
                children: List.generate(3, (i) {
                  final t = ((_c.value + i / 3) % 1);
                  return Container(
                    margin: const EdgeInsets.only(right: 4),
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.35 + (t * 0.65)),
                      shape: BoxShape.circle,
                    ),
                  );
                }),
              ),
            ),
            const SizedBox(width: 8),
            Text('Thinking…', style: AppTheme.host(fontSize: 12, color: AppColors.textMuted)),
          ],
        );
      },
    );
  }
}
