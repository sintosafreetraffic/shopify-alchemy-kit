/**
 * Preview Plan Generator
 * 
 * Shared logic for generating 1-day coach preview plans.
 * Used by both coach-preview-create and potentially other preview flows.
 * 
 * This generates a simplified, deterministic 1-day plan based on quiz data,
 * without requiring authentication or full coach access.
 */

import { generateCoachPreview } from "./sleep-assessment.ts";
import type { SleepAssessment, PersonaCluster } from "./sleep-assessment.ts";

export interface PreviewPlanInput {
  email: string;
  session_id: string;
  quiz_data: Record<string, any>;
  persona_cluster?: PersonaCluster;
  sleep_assessment?: SleepAssessment;
}

export interface PreviewPlanDay {
  day: string;
  focus: string;
  morningTask: {
    title: string;
    duration: string;
    description: string;
  };
  eveningTask: {
    title: string;
    duration: string;
    description: string;
  };
  tip: string;
}

export interface PreviewPlanOutput {
  weeklyPlan: {
    day1: PreviewPlanDay;
  };
  encouragement: string;
  focusAreas: string[];
  planHeadline: string;
  whyThisPlan: string;
  isPreview: true;
  previewMessage: string;
}

/**
 * Generate a 1-day preview plan based on quiz data
 * This is deterministic and does not call AI
 */
export function generatePreviewPlan(input: PreviewPlanInput): PreviewPlanOutput {
  const { quiz_data, persona_cluster, sleep_assessment } = input;
  
  // Extract key data points
  const sleepPosition = quiz_data?.sleepPosition || 'side';
  const painAreas = quiz_data?.painAreas || quiz_data?.painPoints || [];
  const sleepTemperature = quiz_data?.sleepTemperature || 'neutral';
  const roomBrightness = quiz_data?.roomBrightness || 'dark';
  const sleepGoals = quiz_data?.sleepGoals || [];
  
  // Determine persona for personalization
  const persona = persona_cluster || derivePersonaFromQuiz(quiz_data);
  
  // Build focus areas based on persona
  const focusAreas = buildFocusAreas(persona, painAreas, sleepTemperature);
  
  // Generate day 1 plan
  const day1 = generateDay1Plan(persona, sleepPosition, painAreas, roomBrightness);
  
  // Build personalized headline
  const planHeadline = buildHeadline(persona, painAreas);
  
  // Build "why this plan" explanation
  const whyThisPlan = buildWhyThisPlan(persona, painAreas, sleepPosition);
  
  // Encouragement message
  const encouragement = buildEncouragement(persona);
  
  return {
    weeklyPlan: { day1 },
    encouragement,
    focusAreas,
    planHeadline,
    whyThisPlan,
    isPreview: true,
    previewMessage: "This is a preview of your personalized sleep plan. Create an account or sign in to unlock your full 7-day adaptive program with daily guidance and progress tracking.",
  };
}

function derivePersonaFromQuiz(quiz_data: Record<string, any>): PersonaCluster {
  const painAreas = quiz_data?.painAreas || quiz_data?.painPoints || [];
  const hasPain = painAreas.some((p: string) => 
    p.toLowerCase() !== 'none' && p.toLowerCase() !== 'no pain'
  );
  
  if (hasPain) return 'pain_sleeper';
  
  const sleepGoals = quiz_data?.sleepGoals || [];
  const hasStressGoal = sleepGoals.some((g: string) => 
    g.toLowerCase().includes('stress') || 
    g.toLowerCase().includes('relax') ||
    g.toLowerCase().includes('anxiety')
  );
  
  if (hasStressGoal) return 'stress_insomnia';
  
  return 'optimizer';
}

function buildFocusAreas(
  persona: PersonaCluster, 
  painAreas: string[], 
  sleepTemperature: string
): string[] {
  const areas: string[] = [];
  
  switch (persona) {
    case 'pain_sleeper':
      areas.push('Proper pillow positioning for spinal alignment');
      if (painAreas.includes('neck')) {
        areas.push('Cervical support optimization');
      } else if (painAreas.includes('lower_back') || painAreas.includes('hips')) {
        areas.push('Hip and lower spine alignment');
      } else {
        areas.push('Morning tension reduction');
      }
      areas.push('Gentle pre-sleep stretching routine');
      break;
      
    case 'stress_insomnia':
      areas.push('Evening wind-down ritual');
      areas.push('Sleep environment optimization');
      areas.push('Bedtime consistency habits');
      break;
      
    case 'optimizer':
    default:
      areas.push('Sleep quality baseline');
      areas.push('Habit tracking foundation');
      areas.push('Progressive improvement goals');
      break;
  }
  
  return areas.slice(0, 3);
}

function generateDay1Plan(
  persona: PersonaCluster,
  sleepPosition: string,
  painAreas: string[],
  roomBrightness: string
): PreviewPlanDay {
  // Base structure
  const day: PreviewPlanDay = {
    day: 'Day 1',
    focus: '',
    morningTask: {
      title: '',
      duration: '5 min',
      description: '',
    },
    eveningTask: {
      title: '',
      duration: '10 min',
      description: '',
    },
    tip: '',
  };
  
  switch (persona) {
    case 'pain_sleeper':
      day.focus = 'Establishing proper pillow positioning';
      day.morningTask = {
        title: 'Morning Alignment Check',
        duration: '3 min',
        description: 'Before getting up, take a moment to notice how your body feels. Rate your morning stiffness on a scale of 1-10. This baseline helps track improvement.',
      };
      day.eveningTask = {
        title: 'Pillow Position Setup',
        duration: '10 min',
        description: sleepPosition === 'side' 
          ? 'Position your pillow to fill the gap between your ear and shoulder. The goal is a neutral spine - your head should not tilt up or down.'
          : sleepPosition === 'back'
          ? 'Place your pillow to support the natural curve of your neck. Your chin should be in a neutral position, not pushed forward or tucked.'
          : 'For combination sleepers, start on your side with proper neck support. As you transition through the night, the contoured pillow adapts.',
      };
      day.tip = painAreas.includes('neck')
        ? 'Avoid using your phone in bed - the forward head position adds strain to your cervical spine right before sleep.'
        : 'Keep your sleeping environment cool (65-68°F) to reduce muscle tension during sleep.';
      break;
      
    case 'stress_insomnia':
      day.focus = 'Creating a calming pre-sleep routine';
      day.morningTask = {
        title: 'Morning Light Exposure',
        duration: '5 min',
        description: 'Get natural light within 30 minutes of waking. This helps regulate your circadian rhythm and improves sleep onset later.',
      };
      day.eveningTask = {
        title: 'Wind-Down Ritual',
        duration: '15 min',
        description: 'Set a "digital sunset" - dim lights and put away screens 30 minutes before bed. Try a simple breathing exercise: 4 counts in, 7 hold, 8 out.',
      };
      day.tip = roomBrightness === 'bright'
        ? 'Even small amounts of light can disrupt melatonin production. Consider a sleep mask or blackout curtains.'
        : 'Keep your bedroom for sleep only - working or scrolling in bed weakens the mental association with rest.';
      break;
      
    case 'optimizer':
    default:
      day.focus = 'Establishing your sleep baseline';
      day.morningTask = {
        title: 'Sleep Quality Log',
        duration: '2 min',
        description: 'Rate your sleep quality (1-10) and note any disruptions. This data helps identify patterns and measure progress.',
      };
      day.eveningTask = {
        title: 'Environment Check',
        duration: '5 min',
        description: 'Review your sleep setup: Is the room dark enough? Cool enough? Is your pillow positioned correctly for your sleep style?',
      };
      day.tip = 'Consistency is key - try to go to bed and wake up within 30 minutes of the same time, even on weekends.';
      break;
  }
  
  return day;
}

function buildHeadline(persona: PersonaCluster, painAreas: string[]): string {
  switch (persona) {
    case 'pain_sleeper':
      if (painAreas.includes('neck')) {
        return 'Your Neck Pain Relief Plan';
      } else if (painAreas.includes('lower_back') || painAreas.includes('hips')) {
        return 'Your Lower Back & Hip Alignment Plan';
      }
      return 'Your Pain-Free Sleep Plan';
      
    case 'stress_insomnia':
      return 'Your Calm Sleep Ritual';
      
    case 'optimizer':
    default:
      return 'Your Sleep Optimization Journey';
  }
}

function buildWhyThisPlan(
  persona: PersonaCluster, 
  painAreas: string[],
  sleepPosition: string
): string {
  switch (persona) {
    case 'pain_sleeper':
      return `Based on your quiz responses, we've identified spinal alignment as your primary opportunity for better sleep. ${
        sleepPosition === 'side' 
          ? 'As a side sleeper, proper pillow height is crucial to prevent neck strain.' 
          : sleepPosition === 'back'
          ? 'For back sleepers, the right cervical support helps maintain your spine\'s natural curve.'
          : 'As someone who moves through different positions, adaptive support throughout the night is key.'
      } This plan focuses on positioning fundamentals first.`;
      
    case 'stress_insomnia':
      return 'Your responses indicate that mental relaxation and environment play significant roles in your sleep quality. This plan begins by establishing calming rituals and optimizing your sleep environment to help your body naturally transition to rest.';
      
    case 'optimizer':
    default:
      return 'You\'re already on the right track. This plan focuses on fine-tuning your sleep habits and establishing baselines so we can identify specific areas for improvement. Data-driven optimization starts with consistent tracking.';
  }
}

function buildEncouragement(persona: PersonaCluster): string {
  switch (persona) {
    case 'pain_sleeper':
      return 'Small adjustments to your sleep setup can lead to meaningful improvements in how you feel each morning. Let\'s start with the fundamentals and build from there. You\'ve taken the first step by understanding your sleep profile.';
      
    case 'stress_insomnia':
      return 'Creating space for rest is a skill that develops over time. This plan gives you practical tools to quiet your mind and prepare your body for quality sleep. You\'re investing in something that impacts every area of your life.';
      
    case 'optimizer':
    default:
      return 'The pursuit of better sleep is a journey of continuous improvement. By tracking your habits and staying consistent, you\'ll unlock insights that help you perform at your best. Let\'s establish your baseline together.';
  }
}
