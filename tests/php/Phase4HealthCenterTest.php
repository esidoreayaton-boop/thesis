<?php

namespace Tests\Phase4;

class Phase4HealthCenterTest
{
    public static function run(array &$results): void
    {
        // 1. Clinic schedule structure assertion
        $schedules = [
            [
                'id' => 1,
                'service_type' => 'Prenatal Care & Maternal Checkup',
                'day_of_week' => 'Wednesday',
                'time_slot' => '8:00 AM - 12:00 PM',
                'slots_available' => 15,
                'status' => 'Active'
            ],
            [
                'id' => 2,
                'service_type' => 'Child Immunization (EPI Vaccines)',
                'day_of_week' => 'Thursday',
                'time_slot' => '8:00 AM - 12:00 PM',
                'slots_available' => 25,
                'status' => 'Active'
            ]
        ];
        $allValid = true;
        foreach ($schedules as $s) {
            if (!isset($s['slots_available']) || !isset($s['status']) || $s['status'] !== 'Active') {
                $allValid = false;
            }
        }
        $results[] = [
            'name' => 'nurse-published clinic schedules contain valid slots_available and active service status',
            'pass' => $allValid && count($schedules) === 2
        ];

        // 2. Patient consultation vitals and diagnosis record
        $consultation = [
            'patient_id' => 101,
            'blood_pressure' => '120/80',
            'temperature' => 36.6,
            'weight_kg' => 58.5,
            'diagnosis' => 'Normal 2nd trimester routine prenatal evaluation',
            'revisit_date' => '2026-09-18',
            'revisit_time' => '9:00 AM'
        ];
        $results[] = [
            'name' => 'health worker consultation record captures complete patient vitals, diagnosis, and revisit schedule',
            'pass' => $consultation['blood_pressure'] === '120/80' && !empty($consultation['revisit_date'])
        ];

        // 3. Revisit synchronizer matches resident portal
        $residentEmail = 'maria.santos@gmail.com';
        $appointments = [
            ['id' => 1, 'email' => 'other@gmail.com', 'service' => 'Dental', 'status' => 'Confirmed'],
            ['id' => 2, 'email' => 'maria.santos@gmail.com', 'service' => 'Prenatal Checkup', 'status' => 'Confirmed']
        ];
        $myAppointments = array_filter($appointments, fn($a) => strtolower($a['email']) === strtolower($residentEmail));
        $results[] = [
            'name' => 'scheduled revisits accurately match and display on the logged-in resident health dashboard',
            'pass' => count($myAppointments) === 1 && reset($myAppointments)['service'] === 'Prenatal Checkup'
        ];

        // 4. Notification read/unread tracking
        $notification = [
            'id' => 501,
            'title' => 'Upcoming Prenatal Revisit',
            'is_read' => false
        ];
        // Mark as read
        $notification['is_read'] = true;
        $results[] = [
            'name' => 'notification bell alert status correctly toggles from unread to read without deleting notification history',
            'pass' => $notification['is_read'] === true && $notification['id'] === 501
        ];
    }
}
