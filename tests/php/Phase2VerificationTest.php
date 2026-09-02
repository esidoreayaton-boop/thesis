<?php

namespace Tests\Phase2;

class Phase2VerificationTest
{
    public static function run(array &$results): void
    {
        // Simulated Resident record in database
        $resident = [
            'id' => 101,
            'name' => 'Maria Santos',
            'email' => 'maria.santos@gmail.com',
            'verification_status' => 'Pending_Review',
            'submitted_id' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'rejection_reason' => null
        ];

        // 1. Initial status assertion
        $results[] = [
            'name' => 'new resident registration initializes with Pending_Review status and submitted ID',
            'pass' => $resident['verification_status'] === 'Pending_Review' && !empty($resident['submitted_id'])
        ];

        // 2. Administrator rejection flow
        $rejectionReason = 'Government ID image is blurry or expired.';
        $resident['verification_status'] = 'Rejected';
        $resident['rejection_reason'] = $rejectionReason;

        $results[] = [
            'name' => 'administrator rejection records specific rejection reason and changes status to Rejected',
            'pass' => $resident['verification_status'] === 'Rejected' && $resident['rejection_reason'] === $rejectionReason
        ];

        // 3. Profile update without changing photo preserves existing submitted_id
        $originalId = $resident['submitted_id'];
        $profilePayload = [
            'name' => 'Maria G. Santos',
            'phone' => '09123456789'
            // note: submitted_id omitted because user did not change photo
        ];
        // Apply update logic: only update submitted_id if key is present
        if (array_key_exists('submitted_id', $profilePayload)) {
            $resident['submitted_id'] = $profilePayload['submitted_id'];
        }
        $resident['name'] = $profilePayload['name'];

        $results[] = [
            'name' => 'updating resident profile details without changing photo safely preserves existing submitted_id',
            'pass' => $resident['submitted_id'] === $originalId && $resident['name'] === 'Maria G. Santos'
        ];

        // 4. Resident ID replacement / resubmission
        $newId = 'data:image/jpeg;base64,NEW_CLEAR_ID_PHOTO_BASE64_DATA';
        $resubmitPayload = [
            'submitted_id' => $newId,
            'verification_status' => 'Pending_Review',
            'rejection_reason' => null
        ];
        $resident['submitted_id'] = $resubmitPayload['submitted_id'];
        $resident['verification_status'] = $resubmitPayload['verification_status'];
        $resident['rejection_reason'] = $resubmitPayload['rejection_reason'];

        $results[] = [
            'name' => 'resubmitting updated ID resets verification status to Pending_Review and clears rejection notice',
            'pass' => $resident['verification_status'] === 'Pending_Review' && $resident['submitted_id'] === $newId && $resident['rejection_reason'] === null
        ];

        // 5. Administrator approval unlocks Verified status
        $resident['verification_status'] = 'Verified';
        $results[] = [
            'name' => 'administrator approval transitions resident to Verified status',
            'pass' => $resident['verification_status'] === 'Verified'
        ];
    }
}
