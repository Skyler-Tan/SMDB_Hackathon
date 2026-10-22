
package com.threer.web;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.threer.model.User;
import com.threer.repository.UserRepository;
import com.threer.service.SessionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    record RegisterRequest(String username, String email, String phone, String password) {}
    record LoginRequest(String username, String password) {}
    record GoogleLoginRequest(String credential) {}

    private final UserRepository users;
    private final SessionService sessions;
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();

    @Value("${google.client-id:}")
    private String googleClientId;

    public AuthController(UserRepository users, SessionService sessions) {
        this.users = users;
        this.sessions = sessions;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest r) {
        if (isBlank(r.username()) || isBlank(r.email()) || isBlank(r.phone())
                || r.password() == null || r.password().length() < 8) {
            return error(400, "Please fill in all fields. Password needs at least 8 characters.");
        }

        String username = r.username().trim();
        String email = r.email().trim().toLowerCase();
        String phone = r.phone().replaceAll("[\\s()-]", "");

        if (users.existsByUsernameIgnoreCase(username)) {
            return error(409, "This username is already registered. Please log in.");
        }
        if (users.existsByEmailIgnoreCase(email)) {
            return error(409, "This email is already registered.");
        }
        if (users.existsByPhone(phone)) {
            return error(409, "This phone number is already registered.");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPhone(phone);
        user.setPasswordHash(encoder.encode(r.password()));
        users.save(user);

        return ResponseEntity.status(201).body(toDto(user));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest r) {
        String username = r.username() == null ? "" : r.username().trim();
        Optional<User> found = users.findByUsernameIgnoreCase(username);

        if (found.isEmpty() || r.password() == null
                || found.get().getPasswordHash() == null
                || !encoder.matches(r.password(), found.get().getPasswordHash())) {
            return error(401, "Incorrect username or password.");
        }

        return loginUser(found.get());
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody GoogleLoginRequest request) {
        if (request == null || isBlank(request.credential())) {
            return error(400, "Missing Google credential.");
        }

        if (isBlank(googleClientId)) {
            return error(500, "Google sign-in is not configured on the server.");
        }

        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    GsonFactory.getDefaultInstance()
            ).setAudience(List.of(googleClientId)).build();

            GoogleIdToken idToken = verifier.verify(request.credential());

            if (idToken == null) {
                return error(401, "Invalid or expired Google sign-in. Please try again.");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String googleId = payload.getSubject();
            String email = payload.getEmail();
            boolean emailVerified = Boolean.TRUE.equals(payload.getEmailVerified());

            if (isBlank(googleId) || isBlank(email) || !emailVerified) {
                return error(401, "Google did not provide a verified email address.");
            }

            email = email.trim().toLowerCase();

            // Returning Google account.
            Optional<User> googleUser = users.findByGoogleId(googleId);
            if (googleUser.isPresent()) {
                return loginUser(googleUser.get());
            }

            // Never silently link a Google account to an existing password account.
            Optional<User> emailUser = users.findByEmailIgnoreCase(email);
            if (emailUser.isPresent()) {
                return error(409,
                        "An account with this email already exists. Log in with your username and password first.");
            }

            String displayName = (String) payload.get("name");
            String baseUsername = !isBlank(displayName)
                    ? displayName.trim().replaceAll("\\s+", "_")
                    : email.substring(0, email.indexOf('@'));

            if (baseUsername.length() > 25) {
                baseUsername = baseUsername.substring(0, 25);
            }
            if (baseUsername.isBlank()) {
                baseUsername = "google_user";
            }

            String username = baseUsername;
            while (users.existsByUsernameIgnoreCase(username)) {
                username = baseUsername + "_" +
                        UUID.randomUUID().toString().substring(0, 6);
                if (username.length() > 30) {
                    username = username.substring(0, 30);
                }
            }

            User user = new User();
            user.setUsername(username);
            user.setEmail(email);
            user.setPhone(null);
            user.setPasswordHash(null);
            user.setGoogleId(googleId);

            users.save(user);

            return loginUser(user);

        } catch (IOException | GeneralSecurityException e) {
            return error(401, "Could not verify Google sign-in. Please try again.");
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(HttpServletRequest request) {
        String id = (String) request.getAttribute("userId");
        if (id == null) {
            return error(401, "Not logged in.");
        }

        Optional<User> user = users.findById(id);
        if (user.isEmpty()) {
            return error(401, "Not logged in.");
        }

        return ResponseEntity.ok(toDto(user.get()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestHeader(value = "Authorization", required = false) String header) {
        if (header != null && header.startsWith("Bearer ")) {
            sessions.revoke(header.substring(7));
        }
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<?> loginUser(User user) {
        String token = sessions.create(user.getId());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("token", token);
        result.put("user", toDto(user));
        return ResponseEntity.ok(result);
    }

    private static Map<String, Object> toDto(User user) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", user.getId());
        dto.put("username", user.getUsername());
        dto.put("email", user.getEmail());
        dto.put("phone", user.getPhone());
        return dto;
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private static ResponseEntity<?> error(int status, String message) {
        return ResponseEntity.status(status).body(Map.of("message", message));
    }
}
