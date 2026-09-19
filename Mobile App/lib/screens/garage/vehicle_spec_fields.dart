import 'package:flutter/material.dart';

class VehicleSpecSelection {
  VehicleSpecSelection({this.driveType = '', this.bodyType = ''});

  String driveType;
  String bodyType;
}

class VehicleConciergeFormFields extends StatefulWidget {
  const VehicleConciergeFormFields({
    super.key,
    required this.trim,
    required this.engine,
    required this.tyreSize,
    required this.selection,
  });

  final TextEditingController trim;
  final TextEditingController engine;
  final TextEditingController tyreSize;
  final VehicleSpecSelection selection;

  @override
  State<VehicleConciergeFormFields> createState() => _VehicleConciergeFormFieldsState();
}

class _VehicleConciergeFormFieldsState extends State<VehicleConciergeFormFields> {
  static const _driveTypes = <String, String>{
    'fwd': 'Front-wheel drive',
    'rwd': 'Rear-wheel drive',
    'awd': 'All-wheel drive',
    '4wd': 'Four-wheel drive',
  };

  static const _bodyTypes = <String, String>{
    'sedan': 'Sedan',
    'hatch': 'Hatchback',
    'suv': 'SUV',
    'pickup': 'Pickup',
    'van': 'Van',
    'other': 'Other',
  };

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        TextField(controller: widget.trim, decoration: const InputDecoration(labelText: 'Trim')),
        TextField(controller: widget.engine, decoration: const InputDecoration(labelText: 'Engine')),
        DropdownButtonFormField<String>(
          value: _driveTypes.containsKey(widget.selection.driveType) ? widget.selection.driveType : null,
          decoration: const InputDecoration(labelText: 'Drivetrain'),
          items: _driveTypes.entries
              .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
              .toList(),
          onChanged: (value) => setState(() => widget.selection.driveType = value ?? ''),
        ),
        DropdownButtonFormField<String>(
          value: _bodyTypes.containsKey(widget.selection.bodyType) ? widget.selection.bodyType : null,
          decoration: const InputDecoration(labelText: 'Body type'),
          items: _bodyTypes.entries
              .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
              .toList(),
          onChanged: (value) => setState(() => widget.selection.bodyType = value ?? ''),
        ),
        TextField(controller: widget.tyreSize, decoration: const InputDecoration(labelText: 'Tyre size')),
      ],
    );
  }
}
