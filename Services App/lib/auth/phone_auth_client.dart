export 'phone_auth.dart';
export 'phone_auth_client_stub.dart'
    if (dart.library.html) 'phone_auth_client_web.dart'
    if (dart.library.io) 'phone_auth_client_io.dart';
