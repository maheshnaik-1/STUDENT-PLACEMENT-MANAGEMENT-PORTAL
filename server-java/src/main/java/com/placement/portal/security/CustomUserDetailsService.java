package com.placement.portal.security;

import com.placement.portal.entity.User;
import com.placement.portal.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired(required = false)
    private UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        if (userRepository == null) {
            throw new UsernameNotFoundException("UserRepository is not available in current context");
        }
        User user = userRepository.findByEmail(email.toLowerCase().trim())
            .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
        return UserPrincipal.create(user);
    }

    @Transactional(readOnly = true)
    public UserDetails loadUserById(Long id) throws UsernameNotFoundException {
        if (userRepository == null) {
            throw new UsernameNotFoundException("UserRepository is not available in current context");
        }
        User user = userRepository.findById(id)
            .orElseThrow(() -> new UsernameNotFoundException("User not found with ID: " + id));
        return UserPrincipal.create(user);
    }
}
