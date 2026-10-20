package com.threer.web;

import com.threer.model.User;
import com.threer.repository.UserRepository;
import com.threer.service.SessionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    record RegisterRequest(String username, String email, String phone, String password) {}

    record LoginRequest(String username, String password) {}

    private final UserRepository users;
    private final SessionService sessions;
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();

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
        user.setPasswordHash(encoder.encode(r.password())); // never store the raw password
        users.save(user);

        return ResponseEntity.status(201).body(toDto(user));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest r) {
        String username = r.username() == null ? "" : r.username().trim();
        Optional<User> found = users.findByUsernameIgnoreCase(username);

        if (found.isEmpty() || r.password() == null
                || !encoder.matches(r.password(), found.get().getPasswordHash())) {
            return error(401, "Incorrect username or password.");
        }

        User user = found.get();
        String token = sessions.create(user.getId());

        return ResponseEntity.ok(Map.of("token", token, "user", toDto(user)));
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

    private static Map<String, Object> toDto(User user) {
        return Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "email", user.getEmail(),
                "phone", user.getPhone());
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private static ResponseEntity<?> error(int status, String message) {
        return ResponseEntity.status(status).body(Map.of("message", message));
    }
}