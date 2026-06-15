export type Claim = {
  claim_id: string;
  country_code: string;
  claim_type: 'outpatient' | 'inpatient' | 'specialist';
  condition_type: 'general' | 'pre_existing';
  treatment_type: 'normal' | 'emergency' | 'maternity' | 'mental_health' | 'physical_health';
  network_status: 'in_network' | 'out_of_network';
  submission_date: string;
  treatment_date: string;
  policy_start_date: string;
  documents: string[];
  processing_completed_date?: string;
  denial_reason?: string;
  coverage_level?: 'none' | 'partial' | 'same_as_physical' | 'full';
  patient: {
    full_name: string;
    national_id?: string;
    hkid?: string;
  };
  reports?: {
    external?: Record<string, string>;
    internal?: Record<string, string>;
  };
};
