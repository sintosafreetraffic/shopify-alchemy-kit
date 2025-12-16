// Main Profile Tab container - Scandinavian minimalist sleep identity view
import { useState } from 'react';
import { SleepProfile, SleepAssessment } from "@/hooks/useSleepApi";
import { ProfileHero } from './ProfileHero';
import { SleepIdentityCard } from './SleepIdentityCard';
import { ProfileMetrics } from './ProfileMetrics';
import { PainMapMinimal } from './PainMapMinimal';
import { SleepSetupCard } from './SleepSetupCard';
import { ProductRecommendationCard } from './ProductRecommendationCard';
import { AssessmentAccordion } from './AssessmentAccordion';
import { SleepSyncProfileOverview } from './SleepSyncProfileOverview';
import { SleepSetupForm } from '../SleepSetupForm';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClipboardEdit } from 'lucide-react';

interface ProfileTabProps {
  profile: SleepProfile;
  email: string;
  adherenceRate?: number;
  streakDays?: number;
  onRefetch?: () => void;
  onRetakeQuiz?: () => void;
}

export function ProfileTab({ 
  profile, 
  email, 
  adherenceRate, 
  streakDays,
  onRefetch,
  onRetakeQuiz,
}: ProfileTabProps) {
  const [showSetupModal, setShowSetupModal] = useState(false);
  
  const assessment = profile.sleep_assessment as SleepAssessment | undefined;

  return (
    <div className="space-y-11" style={{ backgroundColor: '#F7F7F6' }}>
      {/* Section 1: Profile Hero */}
      <ProfileHero 
        profile={profile} 
        adherenceRate={adherenceRate}
        streakDays={streakDays}
      />

      {/* Section 2: Sleep Identity Card */}
      <SleepIdentityCard profile={profile} />

      {/* Section 3: Profile Metrics */}
      <ProfileMetrics profile={profile} />

      {/* Section 4: Pain Map */}
      <PainMapMinimal profile={profile} />

      {/* Section 5: Sleep Setup */}
      <SleepSetupCard 
        profile={profile} 
        onEditSetup={() => setShowSetupModal(true)}
      />

      {/* Section 6: Product Recommendations */}
      <ProductRecommendationCard recommendations={assessment?.recommendations} />

      {/* Section 7: Assessment Accordion */}
      <AssessmentAccordion quizData={profile.quiz_data} />

      {/* Section 8: SleepSync Profile Overview */}
      <SleepSyncProfileOverview email={email} />

      {/* Retake Assessment CTA */}
      <div className="flex justify-center pt-4 pb-8">
        <Button 
          variant="ghost" 
          onClick={onRetakeQuiz}
          className="text-sm font-normal"
          style={{ color: '#6F6A66' }}
        >
          <ClipboardEdit className="h-4 w-4 mr-2" style={{ color: '#A7B4C2' }} />
          Retake Sleep Assessment
        </Button>
      </div>

      {/* Sleep Setup Modal */}
      <Dialog open={showSetupModal} onOpenChange={setShowSetupModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Sleep Setup</DialogTitle>
          </DialogHeader>
          <SleepSetupForm 
            email={email}
            initialValues={{
              mattress_thickness: profile.mattress_thickness || 'medium',
              mattress_firmness: profile.mattress_firmness || 'medium',
              bed_height: profile.bed_height || 'standard',
              co_sleeping: profile.co_sleeping || 'alone',
              bedding_material: profile.bedding_material || 'cotton',
              pillow_type: profile.pillow_type || 'standard',
            }}
            onSave={() => {
              setShowSetupModal(false);
              onRefetch?.();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
