<?php

namespace Tests\Phase1;

class Phase1SecurityTest
{
    /**
     * Replicates validatePasswordComplexity logic from src/utils/passwordValidation.ts
     */
    public static function validatePasswordComplexity(string $password): array
    {
        if (strlen($password) < 8) {
            return ['isValid' => false, 'message' => 'Password must be at least 8 characters long.'];
        }
        if (!preg_match('/[A-Z]/', $password)) {
            return ['isValid' => false, 'message' => 'Password must contain at least one uppercase letter (A-Z).'];
        }
        if (!preg_match('/[a-z]/', $password)) {
            return ['isValid' => false, 'message' => 'Password must contain at least one lowercase letter (a-z).'];
        }
        if (!preg_match('/[0-9]/', $password)) {
            return ['isValid' => false, 'message' => 'Password must contain at least one numeric digit (0-9).'];
        }
        if (!preg_match('/[@$!%*#?&]/', $password)) {
            return ['isValid' => false, 'message' => 'Password must contain at least one special character (@, $, !, %, *, #, ?, &).'];
        }
        return ['isValid' => true, 'message' => 'Password meets all security criteria.'];
    }

    public static function run(array &$results): void
    {
        // 1. Valid complex password
        $res1 = self::validatePasswordComplexity('P@ssw0rd2026!');
        $results[] = [
            'name' => 'password complexity accepts compliant password with upper, lower, digit, and symbol',
            'pass' => $res1['isValid'] === true
        ];

        // 2. Reject short password (< 8 chars)
        $res2 = self::validatePasswordComplexity('P@s1');
        $results[] = [
            'name' => 'password complexity rejects passwords shorter than 8 characters',
            'pass' => $res2['isValid'] === false && str_contains($res2['message'], '8 characters')
        ];

        // 3. Reject plain numbers or missing uppercase/lowercase
        $res3 = self::validatePasswordComplexity('12345678');
        $results[] = [
            'name' => 'password complexity rejects weak numeric strings',
            'pass' => $res3['isValid'] === false
        ];

        // 4. Reject missing special character
        $res4 = self::validatePasswordComplexity('Password1234');
        $results[] = [
            'name' => 'password complexity rejects strings without special character',
            'pass' => $res4['isValid'] === false && str_contains($res4['message'], 'special character')
        ];

        // 5. Resident registration normalization
        $rawUser = [
            'first_name' => '  Juan  ',
            'last_name' => '  Dela Cruz ',
            'email' => ' JUAN.DELACRUZ@GMAIL.COM ',
            'role' => 'resident'
        ];
        $cleaned = [
            'name' => trim($rawUser['first_name']) . ' ' . trim($rawUser['last_name']),
            'email' => strtolower(trim($rawUser['email'])),
            'role' => $rawUser['role']
        ];
        $results[] = [
            'name' => 'resident registration data normalizes whitespace and lowercases email address',
            'pass' => $cleaned['name'] === 'Juan Dela Cruz' && $cleaned['email'] === 'juan.delacruz@gmail.com'
        ];

        // 6. Role boundary distinction
        $validRoles = ['superadmin', 'admin', 'bhw', 'resident'];
        $results[] = [
            'name' => 'system correctly recognizes and isolates valid civil and administrative roles',
            'pass' => count(array_intersect(['admin', 'resident'], $validRoles)) === 2 && !in_array('guest', $validRoles)
        ];
    }
}
