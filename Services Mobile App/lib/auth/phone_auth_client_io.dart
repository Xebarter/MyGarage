import 'dart:async';
import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:http/http.dart' as http;

import '../config.dart';
import 'phone_auth.dart';

class PhoneAuthClient {
  PhoneAuthClient({this.role = 'buyer'});

  final String role;
  String? _verificationId;

  Future<PhoneAuthStart> start(String e164) async {
    _verificationId = null;
    await _ensureFirebase();

    final done = Completer<void>();
    await FirebaseAuth.instance.verifyPhoneNumber(
      phoneNumber: e164,
      timeout: const Duration(seconds: 90),
      verificationCompleted: (credential) async {
        try {
          await FirebaseAuth.instance.signInWithCredential(credential);
          if (!done.isCompleted) done.complete();
        } catch (e) {
          if (!done.isCompleted) done.completeError(e);
        }
      },
      verificationFailed: (error) {
        if (!done.isCompleted) done.completeError(error);
      },
      codeSent: (verificationId, _) {
        _verificationId = verificationId;
        if (!done.isCompleted) done.complete();
      },
      codeAutoRetrievalTimeout: (verificationId) {
        _verificationId ??= verificationId;
      },
    );
    await done.future;

    final current = FirebaseAuth.instance.currentUser;
    if (current != null && _verificationId == null) {
      final token = await current.getIdToken();
      if (token != null && token.isNotEmpty) {
        return PhoneAuthStart.session(token);
      }
    }
    return const PhoneAuthStart.awaitingSms();
  }

  Future<String> confirmSmsCode(String code) async {
    final sms = code.replaceAll(RegExp(r'\D'), '');
    final current = FirebaseAuth.instance.currentUser;
    if (current != null && _verificationId == null) {
      final token = await current.getIdToken();
      if (token == null || token.isEmpty) {
        throw Exception('Could not verify that code.');
      }
      return token;
    }

    final verificationId = _verificationId;
    if (verificationId == null) {
      throw Exception('Request a new code.');
    }
    final credential = PhoneAuthProvider.credential(
      verificationId: verificationId,
      smsCode: sms,
    );
    final cred = await FirebaseAuth.instance.signInWithCredential(credential);
    final token = await cred.user?.getIdToken();
    if (token == null || token.isEmpty) {
      throw Exception('Could not verify that code.');
    }
    return token;
  }

  Future<void> abort() async {
    _verificationId = null;
    try {
      await FirebaseAuth.instance.signOut();
    } catch (_) {}
  }
}

Future<void> _ensureFirebase() async {
  if (Firebase.apps.isNotEmpty) return;

  final uri = Uri.parse('${AppConfig.apiUrl}/api/auth/firebase-config');
  final res = await http.get(uri, headers: {'Accept': 'application/json'});
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('Phone sign-in is not configured.');
  }
  final json = jsonDecode(res.body);
  if (json is! Map || json['configured'] != true || json['config'] is! Map) {
    throw Exception('Phone sign-in is not configured.');
  }
  final config = Map<String, dynamic>.from(json['config'] as Map);
  final apiKey = config['apiKey']?.toString() ?? '';
  final appId = config['appId']?.toString() ?? '';
  final senderId = config['messagingSenderId']?.toString() ?? '';
  final projectId = config['projectId']?.toString() ?? '';
  if (apiKey.isEmpty || appId.isEmpty || senderId.isEmpty || projectId.isEmpty) {
    throw Exception('Phone sign-in is not configured.');
  }

  await Firebase.initializeApp(
    options: FirebaseOptions(
      apiKey: apiKey,
      appId: appId,
      messagingSenderId: senderId,
      projectId: projectId,
      authDomain: config['authDomain']?.toString(),
      storageBucket: config['storageBucket']?.toString(),
      measurementId: config['measurementId']?.toString(),
    ),
  );
}
