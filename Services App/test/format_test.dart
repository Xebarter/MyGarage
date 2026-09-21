import 'package:flutter_test/flutter_test.dart';

import 'package:mygarage_services/utils/format.dart';

void main() {
  test('statusLabel maps known statuses', () {
    expect(statusLabel('in_progress'), 'In progress');
    expect(statusLabel('matched'), 'Matched');
  });
}
