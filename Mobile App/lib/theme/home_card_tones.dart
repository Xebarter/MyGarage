import 'package:flutter/material.dart';

/// Subtle premium tints for shop product cards. Length is odd so
/// neighbors differ in the 2-column grid (same sequence as the web home).
const homeCardTones = <Color>[
  Color(0xFFE8EDF4), // slate mist
  Color(0xFFE6F0EA), // soft sage
  Color(0xFFEFE8E2), // warm stone
  Color(0xFFE3EEF3), // sky mist
  Color(0xFFEBEAE6), // pewter
];

Color homeCardTone(int index) {
  final len = homeCardTones.length;
  return homeCardTones[((index % len) + len) % len];
}
