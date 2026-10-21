package br.com.ecicla.api.auth;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);

    Optional<User> findByPasswordResetTokenHash(String tokenHash);

    boolean existsByEmail(String email);
}
