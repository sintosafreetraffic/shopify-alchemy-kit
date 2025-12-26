// Main Profile Tab container - Premium Scandinavian sleep identity view
// Spacing: 44-56px between sections, 28-32px padding within cards
import { useState } from 'react';
import { SleepProfile, SleepAssessment } from "@/hooks/useSleepApi";
import { ProfileHero } from './ProfileHero';
import { SleepIdentityCard } from './SleepIdentityCard';
import { ProfileMetrics } from './ProfileMetrics';
import { PainMapMinimal } from './PainMapMinimal';
import { SleepSetupCard } from './SleepSetupCard';
import { ProductRecommendationCard } from './ProductRecommendationCard';
import { OwnedProductsSection } from './OwnedProductsSection';
import { AssessmentAccordion } from './AssessmentAccordion';
import { SleepSyncProfileOverview } from './SleepSyncProfileOverview';
import { ConnectedSourcesCard } from './ConnectedSourcesCard';
import { SleepSetupForm } from '../SleepSetupForm';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useProductOwnership } from '@/hooks/useProductOwnership';

interface ProfileTabProps {
  profile: SleepProfile;
  email: string;
  userId?: string;
  adherenceRate?: number;
  streakDays?: number;
  onRefetch?: () => void;
  onRetakeQuiz?: () => void;
}

export function ProfileTab({ 
  profile, 
  email,
  userId,
  adherenceRate, 
  streakDays,
  onRefetch,
  onRetakeQuiz,
}: ProfileTabProps) {
  const [showSetupModal, setShowSetupModal] = useState(false);
  
  const assessment = profile.sleep_assessment as SleepAssessment | undefined;
  
  // Fetch product ownership data
  const { 
    ownedProducts, 
    isLoading: isLoadingProducts, 
    isSyncing, 
    lastSyncAt, 
    syncProducts,
  } = useProductOwnership(email);

  return (
    <div className="space-y-12 pb-12" style={{ backgroundColor: '#F7F7F6' }}>
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

      {/* Section 6: Owned Products */}
      <OwnedProductsSection
        products={ownedProducts}
        isLoading={isLoadingProducts}
        isSyncing={isSyncing}
        lastSyncAt={lastSyncAt}
        onSync={syncProducts}
      />

      {/* Section 7: Product Recommendations */}
      <ProductRecommendationCard 
        profile={profile}
        recommendations={assessment?.recommendations}
        ownedProducts={ownedProducts}
      />

      {/* Section 8: Assessment Accordion */}
      <AssessmentAccordion quizData={profile.quiz_data} />

      {/* Section 9: Connected Wearables */}
      {userId && <ConnectedSourcesCard userId={userId} />}

      {/* Section 10: SleepSync Profile Overview */}
      <SleepSyncProfileOverview email={email} />

      {/* Retake Assessment CTA */}
      <div className="flex justify-center pt-2">
        <Button 
          variant="ghost" 
          onClick={onRetakeQuiz}
          className="text-sm font-normal h-10 px-5"
          style={{ color: '#6F6A66' }}
        >
          <svg 
            viewBox="0 0 24 24" 
            className="h-4 w-4 mr-2" 
            style={{ stroke: '#A7B4C2', strokeWidth: 1.5, fill: 'none' }}
          >
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          Retake Sleep Assessment
        </Button>
      </div>

      {/* Sleep Setup Modal */}
      <Dialog open={showSetupModal} onOpenChange={setShowSetupModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ color: '#2D2B29' }}>Update Sleep Setup</DialogTitle>
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
