import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../concierge/thread_store.dart';
import '../../models/concierge.dart';
import '../../models/models.dart';
import '../../providers/auth_controller.dart';
import '../../providers/cart_controller.dart';
import '../../router/app_router.dart';
import '../../theme/app_theme.dart';
import '../../utils/active_service_request.dart';
import '../../utils/media_url.dart';
import '../../utils/user_facing_error.dart';
import '../../widgets/place_autocomplete_field.dart';

final _confirmRe = RegExp(
  r'^(yes|yep|yeah|ok|okay|sure|confirm|book it|book them|add them|add it|do it|go ahead|please book|please add|buy it|order it|checkout|check out|pay|take me there|open it|save it|add the car|update it)[\s!.]*$',
  caseSensitive: false,
);

class _Suggest {
  const _Suggest(this.label, this.prompt);
  final String label;
  final String prompt;
}

const _guestSuggestions = <_Suggest>[
  _Suggest('Create account', 'I want to create an account'),
  _Suggest('Browse shop', 'Show me what you sell in the shop'),
  _Suggest('Find brake pads', 'I need brake pads'),
  _Suggest('How can you help?', 'What can you help me do in MyGarage?'),
];

const _memberSuggestions = <_Suggest>[
  _Suggest('Add my car', 'Help me add a car to my garage'),
  _Suggest('Update my car', 'I want to update my car details'),
  _Suggest('Add a car photo', 'I want to add a photo of my car'),
  _Suggest('Track orders', 'Show my recent orders'),
  _Suggest('Track bookings', 'Show my service bookings'),
  _Suggest('Browse shop', 'Show me what you sell in the shop'),
  _Suggest('Book a service', 'Book an oil service'),
  _Suggest('How can you help?', 'What can you help me do in MyGarage?'),
];

class ConciergeScreen extends StatefulWidget {
  const ConciergeScreen({super.key, this.vehicleId});

  final String? vehicleId;

  @override
  State<ConciergeScreen> createState() => _ConciergeScreenState();
}

class _ConciergeScreenState extends State<ConciergeScreen> {
  final _api = BuyerApi(ApiClient());
  final _input = TextEditingController();
  final _location = TextEditingController();
  final _phone = TextEditingController();
  final _scroll = ScrollController();
  final List<ConciergeChatLine> _messages = [];
  ConciergePendingAction? _pending;
  bool _busy = false;
  String? _error;
  bool _needLocation = false;
  bool _needPhone = false;
  double? _locationLat;
  double? _locationLng;
  String? _vehicleId;
  String? _pendingImageUrl;
  bool _uploadingPhoto = false;
  final _money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _vehicleId = widget.vehicleId;
    _input.addListener(() => setState(() {}));
    unawaited(_restoreThread());
  }

  Future<void> _restoreThread() async {
    final thread = await ConciergeThreadStore.load();
    if (!mounted) return;
    setState(() {
      _messages
        ..clear()
        ..addAll(thread.messages);
      _pending = thread.pendingAction;
      final incoming = (widget.vehicleId ?? '').trim();
      _vehicleId = incoming.isNotEmpty ? incoming : thread.vehicleId;
    });
    if (_messages.isNotEmpty) _jump();
  }

  void _persistThread() {
    unawaited(
      ConciergeThreadStore.save(
        ConciergeThread(
          messages: List<ConciergeChatLine>.from(_messages),
          pendingAction: _pending,
          vehicleId: _vehicleId,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _input.dispose();
    _location.dispose();
    _phone.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    if (_busy || _uploadingPhoto) return;
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choose from gallery'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Take a photo'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
          ],
        ),
      ),
    );
    if (source == null || !mounted) return;
    final picked = await ImagePicker().pickImage(source: source, imageQuality: 80, maxWidth: 1600);
    if (picked == null || !mounted) return;
    setState(() {
      _uploadingPhoto = true;
      _error = null;
    });
    try {
      final bytes = await picked.readAsBytes();
      final url = await _api.uploadVehicleImage(bytes, picked.name);
      if (!mounted) return;
      setState(() {
        _pendingImageUrl = url.isEmpty ? null : url;
        _uploadingPhoto = false;
        if (url.isEmpty) _error = 'Could not upload that photo.';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _uploadingPhoto = false;
        _error = userFacingError(e, fallback: 'Could not upload that photo.');
      });
    }
  }

  Future<void> _send([String? preset]) async {
    final text = (preset ?? _input.text).trim();
    final imageUrl = _pendingImageUrl;
    if ((text.isEmpty && (imageUrl == null || imageUrl.isEmpty)) || _busy || _uploadingPhoto) return;
    if (_pending != null && text.isNotEmpty && _confirmRe.hasMatch(text)) {
      _input.clear();
      await _confirm(checkout: _pending?.isQuote == true);
      return;
    }
    _input.clear();
    setState(() {
      _pendingImageUrl = null;
      _messages.add(ConciergeChatLine(
        role: 'user',
        text: text.isEmpty ? 'I attached a photo of my car.' : text,
        imageUrl: imageUrl,
      ));
      _busy = true;
      _error = null;
    });
    _jump();
    try {
      final customerId = context.read<AuthController>().customerId;
      final result = await _api.chatConcierge({
        if (customerId != null) 'customerId': customerId,
        if (_vehicleId != null && _vehicleId!.isNotEmpty) 'vehicleId': _vehicleId,
        'message': text.isEmpty ? 'I attached a photo of my car.' : text,
        if (imageUrl != null && imageUrl.isNotEmpty) 'imageUrl': imageUrl,
        'history': _messages
            .map((m) => {
                  'role': m.role,
                  'content': m.text,
                  if ((m.imageUrl ?? '').isNotEmpty) 'imageUrl': m.imageUrl,
                })
            .toList(),
      });
      if (!mounted) return;
      setState(() {
        _messages.add(ConciergeChatLine(
          role: 'assistant',
          text: result.reply,
          browse: result.productBrowse,
          detail: result.productDetail,
          departments: result.shopCategories.isNotEmpty
              ? result.shopCategories
              : (result.productBrowse?.departments ?? const []),
          orders: result.orderBrowse,
          bookings: result.bookingBrowse,
        ));
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
    _persistThread();
    _jump();
  }

  Future<void> _onSuggestion(_Suggest item) async {
    await _send(item.prompt);
  }

  Future<void> _browseShop({required String label, String category = ''}) async {
    if (_busy) return;
    setState(() {
      _messages.add(ConciergeChatLine(role: 'user', text: label));
      _busy = true;
      _error = null;
    });
    _jump();
    try {
      late final ConciergeProductBrowse browse;
      var departments = <ConciergeShopDepartment>[];
      if (category.isEmpty) {
        final home = await _api.loadConciergeShop();
        browse = home.browse ?? ConciergeProductBrowse(title: 'Shop', products: const []);
        departments = home.departments.isNotEmpty ? home.departments : browse.departments;
      } else {
        browse = await _api.searchConciergeProducts({
          'category': category,
          'limit': 8,
        });
        departments = browse.departments;
      }
      if (!mounted) return;
      setState(() {
        _messages.add(
          ConciergeChatLine(
            role: 'assistant',
            text: browse.products.isNotEmpty
                ? 'Here are ${browse.title.toLowerCase()} from the shop.'
                : 'I could not find parts for that yet. Try another department.',
            browse: browse,
            departments: departments,
          ),
        );
        _busy = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = userFacingError(e, fallback: 'Could not load the shop.');
      });
    }
    _persistThread();
    _jump();
  }

  Future<void> _confirm({bool checkout = true}) async {
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
        if (_locationLat != null) 'destinationLat': _locationLat,
        if (_locationLng != null) 'destinationLng': _locationLng,
        if (_phone.text.trim().isNotEmpty) 'phone': _phone.text.trim(),
      });
      if (!mounted) return;
      if (!result.ok) {
        if (result.code == 'ACTIVE_REQUEST_EXISTS' &&
            (result.requestId ?? '').trim().isNotEmpty) {
          setState(() {
            _busy = false;
            _pending = null;
            _error = result.error;
          });
          context.go(requestingPathFor(result.requestId!.trim()));
          return;
        }
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
          _messages.add(ConciergeChatLine(
            role: 'assistant',
            text: checkout
                ? 'Added those parts to your cart. Opening checkout.'
                : 'Added those parts to your cart.',
            actDone: true,
          ));
        });
        if (checkout && mounted) {
          context.push('/checkout');
        }
      } else if (result.requestId != null && result.requestId!.trim().isNotEmpty) {
        setState(() {
          _pending = null;
          _busy = false;
        });
        if (!mounted) return;
        context.go('/service/requesting?requestId=${Uri.encodeComponent(result.requestId!.trim())}');
      } else {
        final path = (result.hrefMobile ?? result.href ?? '').trim();
        setState(() {
          _pending = null;
          _busy = false;
          _messages.add(ConciergeChatLine(
            role: 'assistant',
            text: (result.message ?? 'Done.').trim(),
            actDone: true,
          ));
        });
        if (path.isNotEmpty && mounted) {
          context.push(path);
        }
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = userFacingError(e, fallback: 'Could not complete that action.');
      });
    }
    _persistThread();
    _jump();
  }

  Future<void> _addProduct(ConciergeProductCard product) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final customerId = context.read<AuthController>().customerId;
      final result = await _api.actConcierge({
        if (customerId != null) 'customerId': customerId,
        'action': {
          'type': 'quote',
          'lines': [
            {
              'productId': product.id,
              'name': product.name,
              'price': product.price,
              'image': product.image,
              'quantity': 1,
            },
          ],
        },
      });
      if (!mounted) return;
      if (!result.ok) {
        setState(() {
          _busy = false;
          _error = result.error ?? 'Could not add that part.';
        });
        return;
      }
      final cart = context.read<CartController>();
      for (final line in result.lines) {
        await cart.add(
          Product(
            id: line.productId,
            name: line.name,
            description: '',
            price: line.price,
            image: line.image,
            category: product.category,
            brand: product.brand,
          ),
          quantity: line.quantity,
        );
      }
      if (!mounted) return;
      setState(() {
        _busy = false;
        _messages.add(ConciergeChatLine(
          role: 'assistant',
          text: 'Added ${product.name} to your cart. Opening checkout.',
          actDone: true,
        ));
      });
      if (mounted) {
        context.push('/checkout');
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = userFacingError(e, fallback: 'Could not add that part.');
      });
    }
    _persistThread();
    _jump();
  }

  Future<void> _loadMore(ConciergeChatLine line) async {
    final browse = line.browse;
    if (browse == null || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final next = await _api.searchConciergeProducts({
        'query': browse.query ?? '',
        'category': browse.category ?? '',
        'offset': browse.offset + browse.products.length,
        'limit': 8,
      });
      if (!mounted) return;
      setState(() {
        line.browse = browse.merge(next);
        _busy = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = userFacingError(e, fallback: 'Could not load more parts.');
      });
    }
    _persistThread();
    _jump();
  }

  void _clear() {
    setState(() {
      _messages.clear();
      _pending = null;
      _error = null;
      _needLocation = false;
      _needPhone = false;
      _pendingImageUrl = null;
      _uploadingPhoto = false;
    });
    unawaited(ConciergeThreadStore.clear());
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
    final canSend = !_busy &&
        !_uploadingPhoto &&
        (_input.text.trim().isNotEmpty || (_pendingImageUrl ?? '').isNotEmpty);
    final signedIn = context.watch<AuthController>().customerId != null;
    final chips = signedIn ? _memberSuggestions : _guestSuggestions;
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
              'Online · account, garage, shop, orders, and bookings',
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
                if (_messages.isEmpty) _EmptyState(onPick: _onSuggestion, items: chips),
                ..._messages.map(
                  (m) => _Bubble(
                    line: m,
                    money: _money,
                    busy: _busy,
                    onOpenCart: () => context.go('/cart'),
                    onOpenProduct: (id) => context.push('/product/$id'),
                    onAdd: _addProduct,
                    onMore: m.browse == null ? null : () => _loadMore(m),
                    onBrowseDepartment: (title) => _browseShop(label: 'Browse $title', category: title),
                  ),
                ),
                if (_pending?.isQuote == true)
                  _QuoteCard(
                    pending: _pending!,
                    money: _money,
                    busy: _busy,
                    onCheckout: () => _confirm(checkout: true),
                    onAddOnly: () => _confirm(checkout: false),
                  ),
                if (_pending?.isBook == true)
                  _BookCard(
                    pending: _pending!,
                    busy: _busy,
                    needLocation: _needLocation,
                    needPhone: _needPhone,
                    location: _location,
                    phone: _phone,
                    onConfirm: () => _confirm(),
                    onPlaceSelected: (pick) {
                      setState(() {
                        _locationLat = pick.lat;
                        _locationLng = pick.lng;
                      });
                    },
                    onLocationTyped: () {
                      setState(() {
                        _locationLat = null;
                        _locationLng = null;
                      });
                    },
                  ),
                if (_pending?.isGuide == true)
                  _GuideCard(
                    pending: _pending!,
                    busy: _busy,
                    onConfirm: () => _confirm(checkout: false),
                    onDismiss: () => setState(() => _pending = null),
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
                  if (_messages.isNotEmpty) _SuggestionRow(onPick: _onSuggestion, enabled: !_busy, items: chips),
                  if (_messages.isNotEmpty) const SizedBox(height: 10),
                  if (_pendingImageUrl != null && _pendingImageUrl!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                        children: [
                          Stack(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(14),
                                child: Image.network(
                                  _pendingImageUrl!,
                                  width: 56,
                                  height: 56,
                                  fit: BoxFit.cover,
                                ),
                              ),
                              Positioned(
                                top: 2,
                                right: 2,
                                child: GestureDetector(
                                  onTap: () => setState(() => _pendingImageUrl = null),
                                  child: Container(
                                    width: 18,
                                    height: 18,
                                    decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                                    child: const Icon(Icons.close, size: 12, color: Colors.white),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 8),
                          Text('Photo ready to send', style: AppTheme.host(fontSize: 12, color: AppColors.textMuted)),
                        ],
                      ),
                    ),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      IconButton(
                        onPressed: _busy || _uploadingPhoto ? null : _pickPhoto,
                        icon: _uploadingPhoto
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.add_photo_alternate_outlined),
                        color: AppColors.primaryDeep,
                      ),
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
                              hintText: 'Add a car, attach a photo, or order parts…',
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
  const _SuggestionRow({required this.onPick, required this.items, this.enabled = true});
  final Future<void> Function(_Suggest item) onPick;
  final List<_Suggest> items;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: items.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final item = items[index];
          return ActionChip(
            label: Text(item.label),
            onPressed: enabled ? () => onPick(item) : null,
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
  const _EmptyState({required this.onPick, required this.items});
  final Future<void> Function(_Suggest item) onPick;
  final List<_Suggest> items;

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
          Text('How can I help?', style: AppTheme.host(fontSize: 17, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(
            'I can create your account, add or update a car, save a photo, find parts, place an order, track deliveries, or book a mechanic — and I will take you through each step.',
            style: AppTheme.host(fontSize: 14, color: AppColors.textSecondary, height: 1.4),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final item in items)
                ActionChip(
                  label: Text(item.label),
                  onPressed: () => onPick(item),
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
  const _Bubble({
    required this.line,
    required this.money,
    required this.busy,
    required this.onOpenCart,
    required this.onOpenProduct,
    required this.onAdd,
    this.onMore,
    this.onBrowseDepartment,
  });

  final ConciergeChatLine line;
  final NumberFormat money;
  final bool busy;
  final VoidCallback onOpenCart;
  final ValueChanged<String> onOpenProduct;
  final ValueChanged<ConciergeProductCard> onAdd;
  final VoidCallback? onMore;
  final ValueChanged<String>? onBrowseDepartment;

  @override
  Widget build(BuildContext context) {
    final mine = line.role == 'user';
    final chips = line.departments.isNotEmpty ? line.departments : (line.browse?.departments ?? const []);
    final wide = line.browse != null || chips.isNotEmpty || line.detail != null || line.orders.isNotEmpty || line.bookings.isNotEmpty;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: mine ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * (wide ? 0.94 : 0.78)),
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
                  if ((line.imageUrl ?? '').isNotEmpty) ...[
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: Image.network(
                        line.imageUrl!,
                        height: 160,
                        width: double.infinity,
                        fit: BoxFit.cover,
                      ),
                    ),
                  ],
                  if (line.orders.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    for (final order in line.orders)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Material(
                          color: AppColors.backgroundLift,
                          borderRadius: BorderRadius.circular(14),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(14),
                            onTap: () {
                              final path = order.hrefMobile.isNotEmpty
                                  ? order.hrefMobile
                                  : '/orders/${Uri.encodeComponent(order.id)}';
                              context.push(path);
                            },
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          order.itemSummary.isEmpty ? 'Order' : order.itemSummary,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: AppTheme.host(fontWeight: FontWeight.w700, fontSize: 13),
                                        ),
                                        Text(
                                          order.status.replaceAll('_', ' '),
                                          style: AppTheme.host(fontSize: 11, color: AppColors.textMuted),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Text(money.format(order.total), style: AppTheme.host(fontWeight: FontWeight.w700, color: AppColors.primaryDeep)),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                  if (line.bookings.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    for (final booking in line.bookings)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Material(
                          color: AppColors.backgroundLift,
                          borderRadius: BorderRadius.circular(14),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(14),
                            onTap: () {
                              final path = booking.hrefMobile.isNotEmpty
                                  ? booking.hrefMobile
                                  : '/service/requesting?requestId=${Uri.encodeComponent(booking.id)}';
                              context.push(path);
                            },
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          booking.service.isEmpty ? 'Service' : booking.service,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: AppTheme.host(fontWeight: FontWeight.w700, fontSize: 13),
                                        ),
                                        Text(
                                          [
                                            booking.status.replaceAll('_', ' '),
                                            if (booking.location.isNotEmpty) booking.location,
                                          ].join(' · '),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: AppTheme.host(fontSize: 11, color: AppColors.textMuted),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Icon(Icons.handyman_outlined, size: 18, color: AppColors.primaryDeep),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                  if (line.browse != null && line.browse!.products.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(line.browse!.title, style: AppTheme.host(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                    const SizedBox(height: 8),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: line.browse!.products.length,
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisSpacing: 8,
                        crossAxisSpacing: 8,
                        childAspectRatio: 0.68,
                      ),
                      itemBuilder: (context, index) {
                        final product = line.browse!.products[index];
                        return _ProductTile(
                          product: product,
                          money: money,
                          busy: busy,
                          onAdd: () => onAdd(product),
                          onOpen: () => onOpenProduct(product.id),
                        );
                      },
                    ),
                    if (line.browse!.hasMore)
                      TextButton(
                        onPressed: busy ? null : onMore,
                        child: const Text('Show more parts'),
                      ),
                  ],
                  if (chips.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 10),
                      child: SizedBox(
                        height: 34,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: chips.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 6),
                          itemBuilder: (context, index) {
                            final dept = chips[index];
                            return ActionChip(
                              label: Text(dept.title.toLowerCase()),
                              onPressed: busy ? null : () => onBrowseDepartment?.call(dept.title),
                              visualDensity: VisualDensity.compact,
                              backgroundColor: AppColors.surface,
                              side: const BorderSide(color: AppColors.border),
                              labelStyle: AppTheme.host(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.primaryDeep),
                            );
                          },
                        ),
                      ),
                    ),
                  if (line.detail != null) ...[
                    const SizedBox(height: 10),
                    Text(line.detail!.name, style: AppTheme.host(fontWeight: FontWeight.w700)),
                    if (line.detail!.description.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(line.detail!.description, style: AppTheme.host(fontSize: 12, color: AppColors.textSecondary, height: 1.35)),
                      ),
                    Text(money.format(line.detail!.price), style: AppTheme.host(fontWeight: FontWeight.w700, color: AppColors.primaryDeep)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton(
                            onPressed: busy ? null : () => onAdd(line.detail!),
                            style: ElevatedButton.styleFrom(
                              minimumSize: const Size.fromHeight(40),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                            ),
                            child: const Text('Buy'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton(
                          onPressed: () => onOpenProduct(line.detail!.id),
                          child: const Text('View'),
                        ),
                      ],
                    ),
                  ],
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

class _ProductTile extends StatelessWidget {
  const _ProductTile({
    required this.product,
    required this.money,
    required this.busy,
    required this.onAdd,
    required this.onOpen,
  });

  final ConciergeProductCard product;
  final NumberFormat money;
  final bool busy;
  final VoidCallback onAdd;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.backgroundLift,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderSoft),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: GestureDetector(
              onTap: onOpen,
              child: product.image.isEmpty
                  ? const ColoredBox(
                      color: AppColors.surfaceMuted,
                      child: Icon(Icons.inventory_2_outlined, color: AppColors.textMuted),
                    )
                  : Image.network(
                      resolveMediaUrl(product.image),
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stack) => const ColoredBox(color: AppColors.surfaceMuted),
                    ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 8, 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(product.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: AppTheme.host(fontSize: 12, fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(money.format(product.price), style: AppTheme.host(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.primaryDeep)),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton(
                        onPressed: busy ? null : onAdd,
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size.fromHeight(32),
                          padding: EdgeInsets.zero,
                          textStyle: AppTheme.host(fontSize: 11, fontWeight: FontWeight.w700),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                        ),
                        child: const Text('Buy'),
                      ),
                    ),
                    const SizedBox(width: 4),
                    OutlinedButton(
                      onPressed: onOpen,
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(40, 32),
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                      ),
                      child: const Text('View'),
                    ),
                  ],
                ),
              ],
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
    required this.onCheckout,
    required this.onAddOnly,
  });

  final ConciergePendingAction pending;
  final NumberFormat money;
  final bool busy;
  final VoidCallback onCheckout;
  final VoidCallback onAddOnly;

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
                Text('Order these parts', style: AppTheme.host(fontWeight: FontWeight.w700, fontSize: 16)),
                Text(
                  'Confirm and I will add them to your cart and open checkout.',
                  style: AppTheme.host(fontSize: 12, color: AppColors.textMuted),
                ),
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
            child: Column(
              children: [
                ElevatedButton(
                  onPressed: busy ? null : onCheckout,
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                  ),
                  child: const Text('Checkout'),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: busy ? null : onAddOnly,
                  child: const Text('Add to cart only'),
                ),
              ],
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
    required this.onPlaceSelected,
    required this.onLocationTyped,
  });

  final ConciergePendingAction pending;
  final bool busy;
  final bool needLocation;
  final bool needPhone;
  final TextEditingController location;
  final TextEditingController phone;
  final VoidCallback onConfirm;
  final ValueChanged<PlacePick> onPlaceSelected;
  final VoidCallback onLocationTyped;

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
              child: PlaceAutocompleteField(
                controller: location,
                onChanged: (_) => onLocationTyped(),
                onPlaceSelected: onPlaceSelected,
                decoration: const InputDecoration(
                  labelText: 'Area or address',
                  hintText: 'Search e.g. Ntinda, Kololo…',
                  prefixIcon: Icon(Icons.place_outlined),
                ),
              ),
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

class _GuideCard extends StatelessWidget {
  const _GuideCard({
    required this.pending,
    required this.busy,
    required this.onConfirm,
    required this.onDismiss,
  });

  final ConciergePendingAction pending;
  final bool busy;
  final VoidCallback onConfirm;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final title = pending.title.isNotEmpty
        ? pending.title
        : pending.type == 'vehicle_create'
            ? 'Add this car'
            : pending.type == 'vehicle_update'
                ? 'Update this car'
                : pending.type == 'auth'
                    ? 'Create an account'
                    : pending.type == 'address_create'
                        ? 'Save address'
                        : pending.type == 'profile_update'
                            ? 'Update profile'
                            : 'Continue';
    final body = pending.description.isNotEmpty
        ? pending.description
        : pending.summary.isNotEmpty
            ? pending.summary
            : [
                if (pending.year > 0) '${pending.year}',
                pending.make,
                pending.model,
                pending.nickname,
                pending.licensePlate,
                pending.fullAddress,
              ].where((e) => e.toString().trim().isNotEmpty).join(' · ');
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
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(title, style: AppTheme.host(fontWeight: FontWeight.w700, fontSize: 16)),
          if (pending.imageUrl.isNotEmpty) ...[
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: Image.network(
                pending.imageUrl,
                height: 140,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
            ),
          ],
          if (body.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(body, style: AppTheme.host(fontSize: 13, color: AppColors.textSecondary, height: 1.35)),
          ],
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: busy ? null : onConfirm,
            child: Text(pending.type == 'navigate' || pending.type == 'auth' ? 'Take me there' : 'Confirm'),
          ),
          TextButton(onPressed: busy ? null : onDismiss, child: const Text('Not now')),
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
