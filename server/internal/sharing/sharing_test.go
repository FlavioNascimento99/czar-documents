package sharing

import "testing"

func TestTokenUniqueness(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 1000; i++ {
		tok := newToken()
		if len(tok) != 32 {
			t.Fatalf("token len=%d", len(tok))
		}
		if seen[tok] {
			t.Fatal("collision")
		}
		seen[tok] = true
	}
}
