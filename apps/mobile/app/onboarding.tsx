import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScreen } from "@/components/ui/KeyboardAwareScreen";
import { StepperHeader } from "@/components/ui/StepperHeader";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { StepShell } from "@/components/onboarding/StepShell";
import { OptionList, type OptionItem } from "@/components/onboarding/OptionList";
import { WelcomeStep } from "@/components/onboarding/WelcomeStep";
import { HeightStep } from "@/components/onboarding/HeightStep";
import { BirthdayStep } from "@/components/onboarding/BirthdayStep";
import { CityStep } from "@/components/onboarding/CityStep";
import { PhotoStep } from "@/components/onboarding/PhotoStep";
import {
  useOnboardingState,
  type CompetitionLevelType,
  type GamePerformanceType,
  type GenderType,
  type MatchExperienceType,
  type SkillLevelType,
  type TrainingStatusType,
} from "@/hooks/useOnboardingState";
import { spacing } from "@/constants/theme";

/**
 * Player onboarding wizard — 13 steps mirroring
 * apps/web/src/pages/PlayerOnboarding.tsx (phone layout).
 */
export default function OnboardingScreen() {
  const { t } = useTranslation("onboarding");
  const ob = useOnboardingState();

  const skillOptions: OptionItem[] = useMemo(
    () => [
      {
        value: "just-starting",
        label: t("skillLevel.justStarting", { defaultValue: "Just starting out" }),
      },
      {
        value: "intermediate",
        label: t("skillLevel.intermediate", { defaultValue: "Intermediate" }),
      },
      {
        value: "advanced",
        label: t("skillLevel.advanced", { defaultValue: "Advanced" }),
      },
      {
        value: "competitive",
        label: t("skillLevel.competitive", {
          defaultValue: "Competitive / Professional",
        }),
      },
    ],
    [t]
  );

  const trainingOptions: OptionItem[] = useMemo(
    () => [
      { value: "no", label: t("training.no", { defaultValue: "No" }) },
      {
        value: "used-to",
        label: t("training.usedTo", {
          defaultValue: "I used to train, but not anymore",
        }),
      },
      {
        value: "currently",
        label: t("training.currently", {
          defaultValue: "Yes, I currently train regularly",
        }),
      },
    ],
    [t]
  );

  const competitionOptions: OptionItem[] = useMemo(
    () => [
      {
        value: "casual",
        label: t("competition.casual", {
          defaultValue: "Just casual games with friends",
        }),
      },
      {
        value: "friendly",
        label: t("competition.friendly", {
          defaultValue: "Friendly or local tournaments",
        }),
      },
      {
        value: "amateur",
        label: t("competition.amateur", {
          defaultValue: "Amateur league matches",
        }),
      },
      {
        value: "federated",
        label: t("competition.federated", {
          defaultValue: "Federated or official competitions",
        }),
      },
    ],
    [t]
  );

  const performanceOptions: OptionItem[] = useMemo(
    () => [
      {
        value: "basic-contact",
        label: t("performance.basicContact", {
          defaultValue:
            "I can make basic contact with the ball and serve underhand",
        }),
      },
      {
        value: "consistent-play",
        label: t("performance.consistentPlay", {
          defaultValue:
            "I can serve overhand and play consistently without major errors",
        }),
      },
      {
        value: "tactical-aware",
        label: t("performance.tacticalAware", {
          defaultValue: "I understand positioning and can execute basic tactics",
        }),
      },
      {
        value: "advanced-skills",
        label: t("performance.advancedSkills", {
          defaultValue: "I can spike, block, and set with good technique",
        }),
      },
      {
        value: "competitive-level",
        label: t("performance.competitiveLevel", {
          defaultValue:
            "I play at a competitive level with advanced skills and game awareness",
        }),
      },
    ],
    [t]
  );

  const matchExperienceOptions: OptionItem[] = useMemo(
    () => [
      {
        value: "none",
        label: t("matchExperience.none", {
          defaultValue: "None or just a few practice sessions",
        }),
      },
      {
        value: "few",
        label: t("matchExperience.few", { defaultValue: "1-10 matches" }),
      },
      {
        value: "some",
        label: t("matchExperience.some", { defaultValue: "11-50 matches" }),
      },
      {
        value: "many",
        label: t("matchExperience.many", { defaultValue: "51-200 matches" }),
      },
      {
        value: "extensive",
        label: t("matchExperience.extensive", { defaultValue: "200+ matches" }),
      },
    ],
    [t]
  );

  const genderOptions: OptionItem[] = useMemo(
    () => [
      { value: "male", label: t("gender.male", { defaultValue: "Male" }) },
      { value: "female", label: t("gender.female", { defaultValue: "Female" }) },
      { value: "diverse", label: t("gender.diverse", { defaultValue: "Diverse" }) },
    ],
    [t]
  );

  const positionOptions: OptionItem[] = useMemo(
    () => ob.positions.map((p) => ({ value: p.id, label: p.name })),
    [ob.positions]
  );

  const secondaryPositionOptions = useMemo(
    () =>
      positionOptions.filter((o) => o.value !== ob.answers.primaryPosition),
    [positionOptions, ob.answers.primaryPosition]
  );

  const positionsBody = (children: React.ReactNode) =>
    ob.positionsLoading ? (
      <View style={styles.loadingWrap}>
        <Spinner fullScreen={false} />
      </View>
    ) : (
      children
    );

  const renderStep = () => {
    switch (ob.currentStep) {
      case 0:
        return (
          <WelcomeStep
            firstName={ob.firstName}
            lastName={ob.lastName}
            onFirstNameChange={ob.setFirstName}
            onLastNameChange={ob.setLastName}
            namesAutoFilled={ob.namesAutoFilled}
          />
        );
      case 1:
        return (
          <StepShell
            title={t("primaryPosition.title", {
              defaultValue: "What's your main position on the court?",
            })}
            subtitle={t("primaryPosition.subtitle", {
              defaultValue:
                "This is the position you feel most comfortable playing.",
            })}
          >
            {positionsBody(
              <OptionList
                options={positionOptions}
                selected={ob.answers.primaryPosition}
                onSelect={ob.setPrimaryPosition}
              />
            )}
          </StepShell>
        );
      case 2:
        return (
          <StepShell
            title={t("secondaryPosition.title", {
              defaultValue: "What other positions can you play? *",
            })}
            subtitle={t("secondaryPosition.subtitle", {
              defaultValue:
                "Select at least one other position that you're comfortable playing",
            })}
          >
            {positionsBody(
              <OptionList
                multi
                options={secondaryPositionOptions}
                selected={ob.answers.secondaryPositions}
                onSelect={ob.toggleSecondaryPosition}
              />
            )}
          </StepShell>
        );
      case 3:
        return (
          <StepShell
            title={t("skillLevel.title", {
              defaultValue: "How would you rate your current skill level?",
            })}
            subtitle={t("skillLevel.subtitle", {
              defaultValue:
                "This helps us understand your general playing experience.",
            })}
          >
            <OptionList
              options={skillOptions}
              selected={ob.answers.generalSkillLevel}
              onSelect={(v) =>
                ob.setAnswer("generalSkillLevel", v as SkillLevelType)
              }
            />
          </StepShell>
        );
      case 4:
        return (
          <StepShell
            title={t("training.title", {
              defaultValue: "Are you receiving regular volleyball training?",
            })}
          >
            <OptionList
              options={trainingOptions}
              selected={ob.answers.trainingStatus}
              onSelect={(v) =>
                ob.setAnswer("trainingStatus", v as TrainingStatusType)
              }
            />
          </StepShell>
        );
      case 5:
        return (
          <StepShell
            title={t("competition.title", {
              defaultValue: "At what level do you usually compete?",
            })}
          >
            <OptionList
              options={competitionOptions}
              selected={ob.answers.competitionLevel}
              onSelect={(v) =>
                ob.setAnswer("competitionLevel", v as CompetitionLevelType)
              }
            />
          </StepShell>
        );
      case 6:
        return (
          <StepShell
            title={t("performance.title", {
              defaultValue:
                "How would you describe your performance during games?",
            })}
            subtitle={t("performance.subtitle", {
              defaultValue:
                "Pick the option that best reflects your typical performance level.",
            })}
          >
            <OptionList
              options={performanceOptions}
              selected={ob.answers.gamePerformance}
              onSelect={(v) =>
                ob.setAnswer("gamePerformance", v as GamePerformanceType)
              }
            />
          </StepShell>
        );
      case 7:
        return (
          <StepShell
            title={t("matchExperience.title", {
              defaultValue: "How many volleyball matches have you played?",
            })}
            subtitle={t("matchExperience.subtitle", {
              defaultValue: "Include both competitive and casual matches.",
            })}
          >
            <OptionList
              options={matchExperienceOptions}
              selected={ob.answers.matchExperience}
              onSelect={(v) =>
                ob.setAnswer("matchExperience", v as MatchExperienceType)
              }
            />
          </StepShell>
        );
      case 8:
        return (
          <HeightStep
            height={ob.answers.height}
            onChange={(h) => ob.setAnswer("height", h)}
          />
        );
      case 9:
        return (
          <BirthdayStep
            value={ob.birthdayDate}
            onChange={ob.setBirthday}
            tooRecent={ob.birthdayTooRecent}
          />
        );
      case 10:
        return (
          <CityStep
            city={ob.city}
            country={ob.country}
            onCityChange={ob.setCity}
            onCountryChange={ob.setCountry}
          />
        );
      case 11:
        return (
          <StepShell
            title={t("gender.title", { defaultValue: "What's your gender?" })}
            subtitle={t("gender.subtitle", {
              defaultValue: "This helps us create balanced teams.",
            })}
          >
            <OptionList
              options={genderOptions}
              selected={ob.answers.gender}
              onSelect={(v) => ob.setAnswer("gender", v as GenderType)}
            />
          </StepShell>
        );
      case 12:
        return (
          <PhotoStep
            photoUrl={ob.photoUrl}
            uploading={ob.uploading}
            onPick={ob.pickPhoto}
            onRemove={ob.removePhoto}
          />
        );
      default:
        return null;
    }
  };

  const stepValid = ob.isStepValid(ob.currentStep);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAwareScreen scroll contentStyle={styles.content}>
        <StepperHeader
          step={ob.currentStep + 1}
          totalSteps={ob.totalSteps}
          onBack={ob.currentStep > 0 ? ob.prevStep : undefined}
        />
        <View style={styles.body}>{renderStep()}</View>
        <View style={styles.footer}>
          {ob.currentStep > 0 ? (
            <Button
              variant="outline"
              title={t("nav.previous", { defaultValue: "Previous" })}
              onPress={ob.prevStep}
              disabled={ob.isSubmitting}
              style={styles.footerButton}
            />
          ) : (
            <View style={styles.footerButton} />
          )}
          {ob.isLastStep ? (
            <Button
              title={
                ob.isSubmitting
                  ? t("nav.creatingProfile", {
                      defaultValue: "Creating Profile...",
                    })
                  : t("nav.completeProfile", {
                      defaultValue: "Complete Profile",
                    })
              }
              onPress={ob.submit}
              loading={ob.isSubmitting}
              disabled={!stepValid || ob.uploading}
              style={styles.footerButton}
            />
          ) : (
            <Button
              title={t("nav.next", { defaultValue: "Next" })}
              onPress={ob.nextStep}
              disabled={!stepValid}
              style={styles.footerButton}
            />
          )}
        </View>
      </KeyboardAwareScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  body: {
    flex: 1,
    paddingVertical: spacing.xxl,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  footerButton: {
    flex: 1,
  },
  loadingWrap: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
});
