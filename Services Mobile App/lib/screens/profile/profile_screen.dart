import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';
import '../../widgets/ui.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late final TextEditingController _name;
  late final TextEditingController _phone;
  late final TextEditingController _address;
  final _formKey = GlobalKey<FormState>();
  final _picker = ImagePicker();
  bool _initialized = false;

  /// Local file path for a newly picked photo not yet uploaded.
  String? _pendingImagePath;
  String? _pendingMime;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    final vendor = context.read<AuthController>().vendor;
    _name = TextEditingController(text: vendor?.name ?? '');
    _phone = TextEditingController(text: vendor?.phone ?? '');
    _address = TextEditingController(text: vendor?.address ?? '');
    _initialized = true;
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final file = await _picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );
      if (file == null || !mounted) return;
      setState(() {
        _pendingImagePath = file.path;
        _pendingMime = file.mimeType ?? _mimeFromPath(file.path);
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not open image picker.'))),
      );
    }
  }

  Future<void> _showImageSourceSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadii.xxl)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 8, 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: AppColors.borderStrong,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
                ListTile(
                  leading: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.primarySoft,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.photo_library_outlined, color: AppColors.primary, size: 20),
                  ),
                  title: Text(
                    'Choose from gallery',
                    style: AppTheme.host(fontWeight: FontWeight.w600),
                  ),
                  onTap: () {
                    Navigator.pop(ctx);
                    _pickImage(ImageSource.gallery);
                  },
                ),
                ListTile(
                  leading: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.surfaceMuted,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.photo_camera_outlined, color: AppColors.textSecondary, size: 20),
                  ),
                  title: Text(
                    'Take a photo',
                    style: AppTheme.host(fontWeight: FontWeight.w600),
                  ),
                  onTap: () {
                    Navigator.pop(ctx);
                    _pickImage(ImageSource.camera);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthController>();
    try {
      List<int>? avatarBytes;
      String? filename;
      var contentType = 'image/jpeg';
      if (_pendingImagePath != null) {
        final file = File(_pendingImagePath!);
        avatarBytes = await file.readAsBytes();
        filename = _pendingImagePath!.split(RegExp(r'[/\\]')).last;
        contentType = _pendingMime ?? _mimeFromPath(_pendingImagePath!);
      }

      await auth.updateProfile(
        name: _name.text,
        phone: _phone.text,
        address: _address.text,
        avatarBytes: avatarBytes,
        avatarFilename: filename,
        avatarContentType: contentType,
      );
      if (!mounted) return;
      setState(() {
        _pendingImagePath = null;
        _pendingMime = null;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile saved')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            userFacingError(e, fallback: 'Could not save profile.'),
          ),
        ),
      );
    }
  }

  String _mimeFromPath(String path) {
    final lower = path.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    return 'image/jpeg';
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final vendor = auth.vendor;
    final email = vendor?.email ?? auth.user?.email ?? '';
    final initials = _initials(vendor?.name ?? email);
    final remoteImage = vendor?.imageUrl;
    final hasPending = _pendingImagePath != null;

    return PageScaffold(
      title: 'Profile',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 110),
        children: [
          GlassCard(
            highlight: true,
            child: Row(
              children: [
                GestureDetector(
                  onTap: auth.busy ? null : _showImageSourceSheet,
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      ClipOval(
                        child: Container(
                          width: 76,
                          height: 76,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.primarySoft,
                            border: Border.all(color: AppColors.primary.withValues(alpha: 0.28), width: 1.5),
                          ),
                          child: hasPending
                              ? Image.file(
                                  File(_pendingImagePath!),
                                  width: 76,
                                  height: 76,
                                  fit: BoxFit.cover,
                                )
                              : remoteImage != null
                                  ? Image.network(
                                      remoteImage,
                                      width: 76,
                                      height: 76,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => Text(
                                        initials,
                                        style: AppTheme.host(
                                          fontSize: 22,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                    )
                                  : Text(
                                      initials,
                                      style: AppTheme.host(
                                        fontSize: 22,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.primary,
                                      ),
                                    ),
                        ),
                      ),
                      Positioned(
                        right: -2,
                        bottom: -2,
                        child: Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                            border: Border.all(color: AppColors.surface, width: 2),
                            boxShadow: AppTheme.cardShadow,
                          ),
                          child: const Icon(Icons.camera_alt_rounded, size: 14, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        vendor?.name.isNotEmpty == true ? vendor!.name : 'Provider',
                        style: AppTheme.host(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(email, style: AppTheme.host(fontSize: 13, color: AppColors.textMuted)),
                      const SizedBox(height: 8),
                      StatusPill(
                        label: hasPending ? 'Photo ready to save' : 'Tap photo to update',
                        color: hasPending ? AppColors.warning : AppColors.primary,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.04),
          const SectionLabel('DETAILS'),
          GlassCard(
            child: Form(
              key: _formKey,
              child: Column(
                children: [
                  TextFormField(
                    controller: _name,
                    decoration: const InputDecoration(labelText: 'Display name'),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _phone,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(labelText: 'Phone'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _address,
                    decoration: const InputDecoration(labelText: 'Address'),
                  ),
                  const SizedBox(height: 22),
                  ElevatedButton(
                    onPressed: auth.busy ? null : _save,
                    child: auth.busy
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('Save changes'),
                  ),
                ],
              ),
            ),
          ).animate().fadeIn(delay: 80.ms, duration: 400.ms),
          const SizedBox(height: 28),
          Center(
            child: TextButton(
              onPressed: () => auth.signOut(),
              child: Text(
                'Sign out',
                style: AppTheme.host(color: AppColors.danger, fontWeight: FontWeight.w600),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _initials(String value) {
    final parts = value.trim().split(RegExp(r'\s+')).where((e) => e.isNotEmpty).toList();
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    if (parts.isNotEmpty) return parts[0].substring(0, parts[0].length >= 2 ? 2 : 1).toUpperCase();
    return 'SP';
  }
}
