import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import 'settle_keyboard_stub.dart'
    if (dart.library.html) 'settle_keyboard_web.dart' as kb;

/// Close the software keyboard and let Flutter Web settle viewport metrics.
///
/// Flutter Web can assert `ViewInsets cannot be negative` when a field is
/// still focused and a route/resize happens as Chrome dismisses the keyboard.
Future<void> settleKeyboard() async {
  FocusManager.instance.primaryFocus?.unfocus();
  try {
    await SystemChannels.textInput.invokeMethod<void>('TextInput.hide');
  } catch (_) {}
  kb.blurDomAndResetScroll();
  final pause = kIsWeb ? const Duration(milliseconds: 320) : const Duration(milliseconds: 40);
  await Future<void>.delayed(pause);
  await WidgetsBinding.instance.endOfFrame;
  kb.blurDomAndResetScroll();
}
