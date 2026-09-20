import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/products_api.dart';
import '../../models/product.dart';
import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';
import '../../widgets/ui.dart';

class ProductEditorScreen extends StatefulWidget {
  const ProductEditorScreen({super.key, this.productId});

  final String? productId;

  @override
  State<ProductEditorScreen> createState() => _ProductEditorScreenState();
}

class _ProductEditorScreenState extends State<ProductEditorScreen> {
  final _api = ProductsApi(ApiClient());
  final _formKey = GlobalKey<FormState>();
  final _picker = ImagePicker();

  final _name = TextEditingController();
  final _brand = TextEditingController();
  final _description = TextEditingController();
  final _category = TextEditingController();
  final _subcategory = TextEditingController();
  final _price = TextEditingController();
  final _compareAt = TextEditingController();

  bool _loading = true;
  bool _saving = false;
  bool _published = true;
  bool _requestFeatured = false;
  String _image = '';
  List<String> _images = [];
  List<_VariantDraft> _variants = [];
  SupplierProduct? _existing;

  bool get _isEdit => widget.productId != null && widget.productId!.isNotEmpty;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  @override
  void dispose() {
    _name.dispose();
    _brand.dispose();
    _description.dispose();
    _category.dispose();
    _subcategory.dispose();
    _price.dispose();
    _compareAt.dispose();
    for (final v in _variants) {
      v.dispose();
    }
    super.dispose();
  }

  Future<void> _bootstrap() async {
    if (!_isEdit) {
      setState(() => _loading = false);
      return;
    }
    final vendorId = context.read<AuthController>().vendorId;
    if (vendorId == null) return;
    try {
      final list = await _api.list(vendorId);
      SupplierProduct? match;
      for (final product in list) {
        if (product.id == widget.productId) {
          match = product;
          break;
        }
      }
      if (!mounted) return;
      if (match == null) {
        setState(() => _loading = false);
        return;
      }
      _existing = match;
      _name.text = match.name;
      _brand.text = match.brand;
      _description.text = match.description;
      _category.text = match.category;
      _subcategory.text = match.subcategory;
      _price.text = match.price > 0 ? match.price.toStringAsFixed(0) : '';
      _compareAt.text = match.compareAtPrice != null ? match.compareAtPrice!.toStringAsFixed(0) : '';
      _published = match.published;
      _requestFeatured = match.featured || match.featuredRequestPending;
      _image = match.image;
      _images = [...match.images];
      _variants = match.variants
          .map((v) => _VariantDraft(id: v.id, label: v.label, price: v.price.toStringAsFixed(0)))
          .toList();
      setState(() => _loading = false);
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not load product.'))),
      );
    }
  }

  Future<void> _pickImage() async {
    try {
      final file = await _picker.pickImage(source: ImageSource.gallery, maxWidth: 1600, imageQuality: 85);
      if (file == null || !mounted) return;
      final bytes = await file.readAsBytes();
      setState(() => _saving = true);
      final url = await _api.uploadListingImage(
        bytes: bytes,
        filename: file.name,
        contentType: file.mimeType ?? 'image/jpeg',
      );
      if (!mounted) return;
      setState(() {
        if (_image.isEmpty) {
          _image = url;
        }
        if (!_images.contains(url)) _images.add(url);
        _saving = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not upload image.'))),
      );
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final vendorId = context.read<AuthController>().vendorId;
    if (vendorId == null) return;
    setState(() => _saving = true);
    try {
      final product = SupplierProduct(
        id: _existing?.id ?? '',
        name: _name.text,
        description: _description.text,
        price: double.tryParse(_price.text.trim()) ?? 0,
        compareAtPrice: double.tryParse(_compareAt.text.trim()),
        image: _image,
        images: _images,
        published: _published,
        featured: _requestFeatured,
        featuredRequestPending: _requestFeatured,
        category: _category.text,
        subcategory: _subcategory.text,
        brand: _brand.text,
        vendorId: vendorId,
        variants: _variants
            .where((v) => v.label.text.trim().isNotEmpty)
            .map(
              (v) => SupplierProductVariant(
                id: v.id.isNotEmpty ? v.id : DateTime.now().microsecondsSinceEpoch.toString(),
                label: v.label.text.trim(),
                price: double.tryParse(v.price.text.trim()) ?? 0,
              ),
            )
            .toList(),
      );
      final payload = product.toPayload(vendorId: vendorId, requestFeatured: _requestFeatured);
      if (_isEdit) {
        await _api.update(widget.productId!, payload);
      } else {
        await _api.create(payload);
      }
      if (!mounted) return;
      context.pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not save product.'))),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AmbientBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: Text(_isEdit ? 'Edit product' : 'New product'),
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : Form(
                key: _formKey,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
                  children: [
                    GlassCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Photos', style: AppTheme.host(fontWeight: FontWeight.w700, fontSize: 16)),
                          const SizedBox(height: 12),
                          SizedBox(
                            height: 88,
                            child: ListView(
                              scrollDirection: Axis.horizontal,
                              children: [
                                for (final url in [_image, ..._images.where((u) => u != _image)].where((u) => u.isNotEmpty))
                                  Padding(
                                    padding: const EdgeInsets.only(right: 8),
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(12),
                                      child: Image.network(url, width: 88, height: 88, fit: BoxFit.cover),
                                    ),
                                  ),
                                PressableScale(
                                  onTap: _saving ? () {} : _pickImage,
                                  child: Container(
                                    width: 88,
                                    height: 88,
                                    decoration: BoxDecoration(
                                      color: AppColors.primarySoft,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: AppColors.border),
                                    ),
                                    child: const Icon(Icons.add_a_photo_outlined, color: AppColors.primary),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    GlassCard(
                      child: Column(
                        children: [
                          TextFormField(
                            controller: _name,
                            decoration: const InputDecoration(labelText: 'Name'),
                            validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _brand,
                            decoration: const InputDecoration(labelText: 'Brand'),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _description,
                            maxLines: 4,
                            decoration: const InputDecoration(labelText: 'Description'),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _category,
                            decoration: const InputDecoration(labelText: 'Department / category'),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _subcategory,
                            decoration: const InputDecoration(labelText: 'Part type'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    GlassCard(
                      child: Column(
                        children: [
                          TextFormField(
                            controller: _price,
                            keyboardType: TextInputType.number,
                            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                            decoration: const InputDecoration(labelText: 'Price (UGX)'),
                            validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _compareAt,
                            keyboardType: TextInputType.number,
                            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                            decoration: const InputDecoration(labelText: 'Compare-at price (optional)'),
                          ),
                          SwitchListTile.adaptive(
                            contentPadding: EdgeInsets.zero,
                            title: Text('Published', style: AppTheme.host(fontWeight: FontWeight.w600)),
                            subtitle: Text(
                              'Hidden listings stay in your catalog but not the shop.',
                              style: AppTheme.host(fontSize: 12.5, color: AppColors.textMuted),
                            ),
                            value: _published,
                            onChanged: (v) => setState(() => _published = v),
                          ),
                          SwitchListTile.adaptive(
                            contentPadding: EdgeInsets.zero,
                            title: Text('Request homepage feature', style: AppTheme.host(fontWeight: FontWeight.w600)),
                            subtitle: Text(
                              'Admin reviews featured requests. You cannot feature yourself.',
                              style: AppTheme.host(fontSize: 12.5, color: AppColors.textMuted),
                            ),
                            value: _requestFeatured,
                            onChanged: (v) => setState(() => _requestFeatured = v),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    GlassCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Variants', style: AppTheme.host(fontWeight: FontWeight.w700, fontSize: 16)),
                          const SizedBox(height: 8),
                          Text(
                            'Optional SKUs such as sizes or volumes.',
                            style: AppTheme.host(fontSize: 13, color: AppColors.textMuted),
                          ),
                          const SizedBox(height: 12),
                          for (var i = 0; i < _variants.length; i++) ...[
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _variants[i].label,
                                    decoration: const InputDecoration(labelText: 'Label'),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                SizedBox(
                                  width: 110,
                                  child: TextField(
                                    controller: _variants[i].price,
                                    keyboardType: TextInputType.number,
                                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                                    decoration: const InputDecoration(labelText: 'UGX'),
                                  ),
                                ),
                                IconButton(
                                  onPressed: () => setState(() {
                                    _variants.removeAt(i).dispose();
                                  }),
                                  icon: const Icon(Icons.close_rounded),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                          ],
                          OutlinedButton.icon(
                            onPressed: () => setState(() => _variants.add(_VariantDraft())),
                            icon: const Icon(Icons.add),
                            label: const Text('Add variant'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _saving ? null : _save,
                      child: _saving
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.onPrimary),
                            )
                          : Text(_isEdit ? 'Save changes' : 'Create listing'),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}

class _VariantDraft {
  _VariantDraft({this.id = '', String label = '', String price = ''})
      : label = TextEditingController(text: label),
        price = TextEditingController(text: price);

  final String id;
  final TextEditingController label;
  final TextEditingController price;

  void dispose() {
    label.dispose();
    price.dispose();
  }
}
