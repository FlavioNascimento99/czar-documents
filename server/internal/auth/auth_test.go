package auth

import "testing"

func TestPasswordRoundtrip(t *testing.T) {
	h, err := HashPassword("correct-horse-123")
	if err != nil {
		t.Fatal(err)
	}
	if err := CheckPassword(h, "correct-horse-123"); err != nil {
		t.Fatal("should verify")
	}
	if err := CheckPassword(h, "wrong"); err == nil {
		t.Fatal("should reject wrong password")
	}
}

func TestJWT(t *testing.T) {
	tok, err := SignToken("test-secret-12345678901234567890", "user-1")
	if err != nil {
		t.Fatal(err)
	}
	uid, err := ParseToken("test-secret-12345678901234567890", tok)
	if err != nil || uid != "user-1" {
		t.Fatalf("bad token: %v", err)
	}
	if _, err := ParseToken("other-secret", tok); err == nil {
		t.Fatal("wrong secret should fail")
	}
}
