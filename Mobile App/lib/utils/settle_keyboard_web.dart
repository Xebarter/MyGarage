// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use
import 'dart:html' as html;

/// Blur any DOM input and pin the window at (0, 0) so Flutter Web does not
/// compute negative viewInsets while the virtual keyboard is closing.
void blurDomAndResetScroll() {
  try {
    html.document.activeElement?.blur();
  } catch (_) {}
  try {
    html.window.scrollTo(0, 0);
    html.document.documentElement?.scrollTop = 0;
    html.document.body?.scrollTop = 0;
  } catch (_) {}
}
