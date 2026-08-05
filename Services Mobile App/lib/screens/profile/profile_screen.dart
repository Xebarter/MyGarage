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
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.photo_library_outlined),
                title: const Text('Choose from gallery'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImage(ImageSource.gallery);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_camera_outlined),
                title: const Text('Take a photo'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImage(ImageSource.camera);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
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

      await context.read<AuthController>().updateProfile(
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
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
        children: [
          GlassCard(
            child: Row(
              children: [
                GestureDetector(
                  onTap: auth.busy ? null : _showImageSourceSheet,
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      ClipOval(
                        child: Container(
                          width: 72,
                          height: 72,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: LinearGradient(
                              colors: [
                                AppColors.primary.withOpacity(0.35),
                                AppColors.primaryDeep.withOpacity(0.2),
                              ],
                            ),
                            border: Border.all(color: AppColors.primary.withOpacity(0.35)),
                          ),
                          child: hasPending
                              ? Image.file(
                                  File(_pendingImagePath!),
                                  width: 72,
                                  height: 72,
                                  fit: BoxFit.cover,
                                )
                              : remoteImage != null
                                  ? Image.network(
                                      remoteImage,
                                      width: 72,
                                      height: 72,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => Text(
                                        initials,
                                        style: AppTheme.host(
                                          fontSize: 20,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                    )
                                  : Text(
                                      initials,
                                      style: AppTheme.host(
                                        fontSize: 20,
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
                          ),
                          child: const Icon(Icons.camera_alt, size: 14, color: Colors.white),
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
                        style: AppTheme.host(fontSize: 20, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 4),
                      Text(email, style: AppTheme.host(fontSize: 13, color: AppColors.textMuted)),
                      const SizedBox(height: 6),
                      Text(
                        'Tap photo to update',
                        style: AppTheme.host(fontSize: 12, color: AppColors.textMuted),
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
