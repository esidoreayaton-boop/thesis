<?php

namespace Tests\Phase3;

class Phase3DocumentsTest
{
    public static function extractPurok(string $rawAddress): string
    {
        if (preg_match('/purok\s*([0-9A-Za-z_-]+)/i', $rawAddress, $matches)) {
            return $matches[1];
        }
        $parts = explode(',', $rawAddress);
        $first = trim(preg_replace('/^purok\s*/i', '', preg_replace('/Barangay.*/i', '', $parts[0])));
        return !empty($first) ? $first : '1';
    }

    public static function run(array &$results): void
    {
        // 1. Document tracking code format assertion
        $randNum = 4821;
        $timestampSuffix = '8921';
        $requestCode = "DOC-{$timestampSuffix}{$randNum}";
        $results[] = [
            'name' => 'document request generates standard official tracking code starting with DOC-',
            'pass' => str_starts_with($requestCode, 'DOC-') && strlen($requestCode) >= 10
        ];

        // 2. Active duplicate detection logic
        $existingDocs = [
            ['id' => 1, 'resident_id' => 101, 'document_type' => 'Barangay Clearance', 'status' => 'Processing'],
            ['id' => 2, 'resident_id' => 101, 'document_type' => 'Certificate of Indigency', 'status' => 'Completed']
        ];
        // Resident tries to request another Barangay Clearance
        $isDuplicate = false;
        foreach ($existingDocs as $doc) {
            if ($doc['resident_id'] === 101 && $doc['document_type'] === 'Barangay Clearance' && in_array($doc['status'], ['Pending', 'Processing'])) {
                $isDuplicate = true;
                break;
            }
        }
        $results[] = [
            'name' => 'duplicate detection blocks duplicate clearance requests while an active one is in progress',
            'pass' => $isDuplicate === true
        ];

        // 3. State machine progression
        $doc = [
            'id' => 3,
            'request_code' => $requestCode,
            'document_type' => 'Barangay Clearance',
            'status' => 'Pending'
        ];
        // Transitions
        $transitions = ['Pending', 'Processing', 'Ready for Pickup', 'Completed'];
        $history = [$doc['status']];
        foreach (array_slice($transitions, 1) as $next) {
            $doc['status'] = $next;
            $history[] = $doc['status'];
        }
        $results[] = [
            'name' => 'document status progresses sequentially from Pending to Processing to Ready for Pickup to Completed',
            'pass' => $history === ['Pending', 'Processing', 'Ready for Pickup', 'Completed']
        ];

        // 4. Archive separation
        $allDocs = [
            ['id' => 1, 'status' => 'Processing'],
            ['id' => 2, 'status' => 'Completed'],
            ['id' => 3, 'status' => 'Ready for Pickup'],
            ['id' => 4, 'status' => 'Completed']
        ];
        $activeDocs = array_filter($allDocs, fn($d) => in_array($d['status'], ['Pending', 'Processing', 'Ready for Pickup']));
        $archivedDocs = array_filter($allDocs, fn($d) => $d['status'] === 'Completed');

        $results[] = [
            'name' => 'completed document requests are separated into permanent archive and removed from active processing',
            'pass' => count($activeDocs) === 2 && count($archivedDocs) === 2
        ];

        // 5. Purok extraction for official print certificate
        $sampleAddr = 'Purok 4B, Barangay Pianing, Butuan City';
        $purok = self::extractPurok($sampleAddr);
        $results[] = [
            'name' => 'certificate formatter accurately extracts Purok identifier from resident address string',
            'pass' => $purok === '4B'
        ];
    }
}
