import 'package:flutter/material.dart';

/// Subtle premium tints for shop product cards. Length is odd so
/// neighbors differ in the 2-column grid (same sequence as the web home).
const homeCardTones = <Color>[
  Color(0xFFF3E7C8), // champagne
  Color(0xFFD8F3E6), // mint
  Color(0xFFF8E3D4), // peach
  Color(0xFFE7F1D8), // citrus leaf
  Color(0xFFF6EDDF), // warm sand
];

Color homeCardTone(int index) {
  final len = homeCardTones.length;
  return homeCardTones[((index % len) + len) % len];
}
