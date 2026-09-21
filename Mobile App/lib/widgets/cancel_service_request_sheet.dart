import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

enum ServiceCancelStage { searching, enRoute }

class ServiceCancelReason {
  const ServiceCancelReason({
    required this.id,
    required this.label,
    required this.detail,
    required this.stages,
  });

  final String id;
  final String label;
  final String detail;
  final Set<ServiceCancelStage> stages;
}

const otherCancelReasonId = 'other';
const maxCancelNoteLength = 180;

const buyerServiceCancelReasons = <ServiceCancelReason>[
  ServiceCancelReason(
    id: 'waited_too_long',
    label: 'Waited too long',
    detail: 'The search or arrival is taking longer than I can wait.',
    stages: {ServiceCancelStage.searching, ServiceCancelStage.enRoute},
  ),
  ServiceCancelReason(
    id: 'found_help_elsewhere',
    label: 'Found help elsewhere',
    detail: 'Someone else is already taking care of this.',
    stages: {ServiceCancelStage.searching, ServiceCancelStage.enRoute},
  ),
  ServiceCancelReason(
    id: 'issue_resolved',
    label: 'Issue resolved itself',
    detail: 'I no longer need this service.',
    stages: {ServiceCancelStage.searching, ServiceCancelStage.enRoute},
  ),
  ServiceCancelReason(
    id: 'wrong_service',
    label: 'Wrong service selected',
    detail: 'I booked the wrong type of help.',
    stages: {ServiceCancelStage.searching, ServiceCancelStage.enRoute},
  ),
  ServiceCancelReason(
    id: 'wrong_location',
    label: 'Location is incorrect',
    detail: 'The pin or address is not where I am.',
    stages: {ServiceCancelStage.searching, ServiceCancelStage.enRoute},
  ),
  ServiceCancelReason(
    id: 'provider_too_slow',
    label: 'Provider is taking too long',
    detail: 'They accepted, but they will not arrive soon enough.',
    stages: {ServiceCancelStage.enRoute},
  ),
  ServiceCancelReason(
    id: 'provider_not_coming',
    label: 'Provider does not seem to be coming',
    detail: 'They are not moving toward me.',
    stages: {ServiceCancelStage.enRoute},
  ),
  ServiceCancelReason(
    id: 'unsafe',
    label: 'I no longer feel safe',
    detail: 'I want to cancel for safety or comfort.',
    stages: {ServiceCancelStage.enRoute},
  ),
  ServiceCancelReason(
    id: 'need_to_leave',
    label: 'I have to leave',
    detail: 'I cannot stay at this location.',
    stages: {ServiceCancelStage.searching, ServiceCancelStage.enRoute},
  ),
  ServiceCancelReason(
    id: 'price_concern',
    label: 'Price or payment concern',
    detail: 'I am not comfortable with the cost.',
    stages: {ServiceCancelStage.searching, ServiceCancelStage.enRoute},
  ),
  ServiceCancelReason(
    id: 'booked_by_mistake',
    label: 'Booked by mistake',
    detail: 'This request was accidental.',
    stages: {ServiceCancelStage.searching, ServiceCancelStage.enRoute},
  ),
  ServiceCancelReason(
    id: otherCancelReasonId,
    label: 'Something else',
    detail: 'None of these fit — add a short note.',
    stages: {ServiceCancelStage.searching, ServiceCancelStage.enRoute},
  ),
];

List<ServiceCancelReason> cancelReasonsForStage(ServiceCancelStage stage) =>
    buyerServiceCancelReasons.where((r) => r.stages.contains(stage)).toList();

ServiceCancelStage cancelStageFromRequest({
  required String status,
  String? acceptedAt,
}) {
  final s = status.toLowerCase();
  if (s == 'matched' ||
      s == 'in_progress' ||
      (acceptedAt != null && acceptedAt.trim().isNotEmpty)) {
    return ServiceCancelStage.enRoute;
  }
  return ServiceCancelStage.searching;
}

bool canBuyerCancelBeforeArrival({
  required String status,
  String? arrivedAt,
  String? startedAt,
}) {
  final s = status.toLowerCase();
  if (s == 'completed' || s == 'cancelled' || s == 'canceled' || s == 'expired') {
    return false;
  }
  if (s == 'in_progress' || (startedAt != null && startedAt.trim().isNotEmpty)) {
    return false;
  }
  if (arrivedAt != null && arrivedAt.trim().isNotEmpty) return false;
  return s == 'pending' || s == 'matched';
}

class ServiceCancelChoice {
  const ServiceCancelChoice({required this.reasonId, this.note});

  final String reasonId;
  final String? note;
}

Future<ServiceCancelChoice?> showCancelServiceRequestSheet(
  BuildContext context, {
  required ServiceCancelStage stage,
  String? service,
  String? location,
}) {
  return showModalBottomSheet<ServiceCancelChoice>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => _CancelServiceRequestSheet(
      stage: stage,
      service: service,
      location: location,
    ),
  );
}

class _CancelServiceRequestSheet extends StatefulWidget {
  const _CancelServiceRequestSheet({
    required this.stage,
    this.service,
    this.location,
  });

  final ServiceCancelStage stage;
  final String? service;
  final String? location;

  @override
  State<_CancelServiceRequestSheet> createState() => _CancelServiceRequestSheetState();
}

class _CancelServiceRequestSheetState extends State<_CancelServiceRequestSheet> {
  String? _reasonId;
  final _note = TextEditingController();

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reasons = cancelReasonsForStage(widget.stage);
    final searching = widget.stage == ServiceCancelStage.searching;
    final bottom = MediaQuery.paddingOf(context).bottom;
    final other = _reasonId == otherCancelReasonId;
    final note = _note.text.trim();
    final canSubmit = _reasonId != null && (!other || note.length >= 3);

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
          boxShadow: AppTheme.softShadow,
        ),
        child: SafeArea(
          top: false,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.sizeOf(context).height * 0.88,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(height: 10),
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(22, 16, 22, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        searching ? 'CANCEL SEARCH' : 'CANCEL REQUEST',
                        style: AppTheme.host(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.4,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        searching
                            ? 'Why are you stopping this search?'
                            : 'Why are you cancelling before the provider arrives?',
                        style: AppTheme.host(fontSize: 20, fontWeight: FontWeight.w800, height: 1.2),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        searching
                            ? 'We will stop notifying providers. You can request again anytime.'
                            : 'The provider will be released. You can book again if you still need help.',
                        style: AppTheme.host(fontSize: 13.5, height: 1.35, color: AppColors.textSecondary),
                      ),
                      if ((widget.service ?? '').trim().isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                          decoration: BoxDecoration(
                            color: AppColors.background,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.service!.trim(),
                                style: AppTheme.host(fontSize: 14, fontWeight: FontWeight.w700),
                              ),
                              if ((widget.location ?? '').trim().isNotEmpty)
                                Padding(
                                  padding: const EdgeInsets.only(top: 2),
                                  child: Text(
                                    widget.location!.trim(),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: AppTheme.host(fontSize: 12, color: AppColors.textMuted),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                Flexible(
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                    shrinkWrap: true,
                    itemCount: reasons.length + (other ? 1 : 0),
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      if (other && index == reasons.length) {
                        return TextField(
                          controller: _note,
                          maxLength: maxCancelNoteLength,
                          minLines: 2,
                          maxLines: 3,
                          textCapitalization: TextCapitalization.sentences,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            hintText: 'Tell us what happened',
                            counterText: '${note.length}/$maxCancelNoteLength',
                            filled: true,
                            fillColor: AppColors.background,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(14),
                              borderSide: const BorderSide(color: AppColors.border),
                            ),
                          ),
                        );
                      }
                      final reason = reasons[index];
                      final selected = _reasonId == reason.id;
                      return Material(
                        color: selected ? AppColors.primarySoft : AppColors.background,
                        borderRadius: BorderRadius.circular(16),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(16),
                          onTap: () => setState(() => _reasonId = reason.id),
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                            child: Row(
                              children: [
                                Icon(
                                  selected ? Icons.radio_button_checked : Icons.radio_button_off,
                                  color: selected ? AppColors.primary : AppColors.textMuted,
                                  size: 22,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        reason.label,
                                        style: AppTheme.host(fontSize: 15, fontWeight: FontWeight.w700),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        reason.detail,
                                        style: AppTheme.host(
                                          fontSize: 12.5,
                                          height: 1.3,
                                          color: AppColors.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                Padding(
                  padding: EdgeInsets.fromLTRB(16, 4, 16, 12 + bottom),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      SizedBox(
                        height: 52,
                        child: FilledButton(
                          onPressed: canSubmit
                              ? () => Navigator.of(context).pop(
                                    ServiceCancelChoice(
                                      reasonId: _reasonId!,
                                      note: other ? note : null,
                                    ),
                                  )
                              : null,
                          child: const Text('Confirm cancellation'),
                        ),
                      ),
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(),
                        child: const Text('Keep this request'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
