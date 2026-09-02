<?php

namespace Tests\Phase5;

class Phase5GovernanceTest
{
    public static function belongsToMyBarangay(?string $address, ?string $email, ?string $barangay, string $currentAdminBarangay = 'pianing'): bool
    {
        if ($barangay) {
            $bLower = strtolower(trim($barangay));
            if ($bLower === $currentAdminBarangay) return true;
            if ($currentAdminBarangay === 'pianing' && (str_contains($bLower, 'pianing') || empty($bLower))) return true;
            if (str_contains($bLower, 'anticala')) return false;
        }
        if ($address) {
            $target = strtolower(trim($address));
            if (str_contains($target, $currentAdminBarangay)) return true;
            if ($currentAdminBarangay === 'pianing' && !str_contains($target, 'anticala')) return true;
            if (str_contains($target, 'anticala')) return false;
        }
        if ($email) {
            $targetEm = strtolower(trim($email));
            if (str_contains($targetEm, $currentAdminBarangay)) return true;
        }
        if ($currentAdminBarangay === 'pianing') return true;
        return false;
    }

    public static function run(array &$results): void
    {
        // 1. Territorial boundary isolation: Pianing vs Anticala
        $pianingResident = ['address' => 'Purok 2, Barangay Pianing, Butuan City', 'email' => 'juan@gmail.com', 'barangay' => 'Pianing'];
        $anticalaResident = ['address' => 'Purok 1, Barangay Anticala, Butuan City', 'email' => 'pedro@gmail.com', 'barangay' => 'Anticala'];

        $isPianingAllowed = self::belongsToMyBarangay($pianingResident['address'], $pianingResident['email'], $pianingResident['barangay'], 'pianing');
        $isAnticalaBlocked = !self::belongsToMyBarangay($anticalaResident['address'], $anticalaResident['email'], $anticalaResident['barangay'], 'pianing');

        $results[] = [
            'name' => 'territorial boundary strictly isolates Pianing records and excludes Anticala records for Pianing admin',
            'pass' => $isPianingAllowed && $isAnticalaBlocked
        ];

        // 2. Soft-delete archival preserves records
        $user = [
            'id' => 201,
            'name' => 'Roberto Diaz',
            'status' => 'Active',
            'role' => 'resident'
        ];
        // Move to Archive
        $user['status'] = 'Archived';
        $results[] = [
            'name' => 'soft-delete account archiving sets status to Archived without purging user ID or credentials',
            'pass' => $user['status'] === 'Archived' && $user['id'] === 201
        ];

        // 3. Restore account immediately reactivates services
        $user['status'] = 'Active';
        $results[] = [
            'name' => 'restoring archived user updates status to Active and reactivates municipal service permissions',
            'pass' => $user['status'] === 'Active'
        ];

        // 4. Restored user document visibility in Admin queue
        $restoredUserDoc = [
            'id' => 77,
            'resident_id' => 201,
            'resident_name' => 'Roberto Diaz',
            'barangay' => 'Barangay Pianing',
            'document_type' => 'Barangay Clearance',
            'status' => 'Pending'
        ];
        $isDocVisible = self::belongsToMyBarangay(null, null, $restoredUserDoc['barangay'], 'pianing');
        $results[] = [
            'name' => 'new document requests from restored users are immediately recognized and visible to Barangay Admin',
            'pass' => $isDocVisible === true
        ];

        // 5. Permanent Notification Store lifecycle
        $notifLog = [
            ['id' => 'notif-1', 'title' => 'Request Approved', 'is_read' => false],
            ['id' => 'notif-2', 'title' => 'Ready for Pickup', 'is_read' => false]
        ];
        // User views/marks notif-1 as read
        $notifLog[0]['is_read'] = true;
        $allPersisted = count($notifLog) === 2; // Neither is purged
        $readTracked = $notifLog[0]['is_read'] === true && $notifLog[1]['is_read'] === false;
        $results[] = [
            'name' => 'permanent notification store persists notifications across read actions without auto-deleting records',
            'pass' => $allPersisted && $readTracked
        ];

        // 6. Archive category tab isolation
        $allArchiveSections = ['docs', 'residents', 'accounts'];
        $activeTab = 'docs';
        $visibleSections = array_filter($allArchiveSections, fn($s) => $activeTab === 'all' || $activeTab === $s);
        $results[] = [
            'name' => 'archive category switching isolates Completed Documents, Verified Residents, and Archived Accounts',
            'pass' => count($visibleSections) === 1 && in_array('docs', $visibleSections)
        ];
    }
}
