package com.nestmanager.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * JwtFilter — intercepts every HTTP request and validates the JWT token
 *
 * Extends OncePerRequestFilter so it runs exactly once per request.
 *
 * Flow for every request:
 *  1. Read the "Authorization" header
 *  2. If it starts with "Bearer ", extract the token
 *  3. Extract the username from the token
 *  4. Load the user from DB using UserDetailsService
 *  5. Validate the token (not expired, username matches)
 *  6. If valid → set authentication in SecurityContext
 *  7. If invalid or missing → do nothing (Security will return 401)
 *  8. Pass the request to the next filter in the chain
 *
 * The frontend sends the token like this on every fetch() call:
 *   headers: { "Authorization": "Bearer eyJhbGci..." }
 */
@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        // Step 1: Read Authorization header
        final String authHeader = request.getHeader("Authorization");

        // Step 2: If header is missing or doesn't start with "Bearer ", skip
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Step 3: Extract token (remove "Bearer " prefix — 7 characters)
        final String jwt = authHeader.substring(7);

        try {
            // Step 4: Extract username from token
            final String username = jwtUtil.extractUsername(jwt);

            // Step 5: Only authenticate if username is found and not already authenticated
            if (username != null &&
                    SecurityContextHolder.getContext().getAuthentication() == null) {

                // Step 6: Load user from database
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                // Step 7: Validate token
                if (jwtUtil.isTokenValid(jwt, userDetails)) {

                    // Step 8: Create authentication token and set in SecurityContext
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,                          // credentials (not needed after auth)
                                    userDetails.getAuthorities()   // roles: [ROLE_ADMIN, etc.]
                            );

                    authToken.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request)
                    );

                    // This marks the user as authenticated for this request
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            // Invalid token (expired, wrong signature, malformed)
            // Don't throw — just let the request continue unauthenticated
            // Spring Security will return 401 automatically
            logger.warn("JWT validation failed: " + e.getMessage());
        }

        // Step 9: Pass to next filter
        filterChain.doFilter(request, response);
    }
}
