-- Rescale existing players' skill ratings from old 0-100 scale to new 0-75 onboarding scale.
-- Uses stored onboarding answer columns to recalculate with the 0.75x scoring maps.
-- Only affects players who haven't been recalculated yet (rating_history IS NULL).

UPDATE players
SET
  skill_rating = GREATEST(15, LEAST(75,
    CASE general_skill_level
      WHEN 'just-starting' THEN 4
      WHEN 'intermediate' THEN 11
      WHEN 'advanced' THEN 19
      WHEN 'competitive' THEN 23
      ELSE 4
    END
    +
    CASE game_performance
      WHEN 'basic-contact' THEN 4
      WHEN 'consistent-play' THEN 8
      WHEN 'tactical-aware' THEN 11
      WHEN 'advanced-skills' THEN 15
      WHEN 'competitive-level' THEN 19
      ELSE 4
    END
    +
    CASE competition_level
      WHEN 'casual' THEN 4
      WHEN 'friendly' THEN 8
      WHEN 'amateur' THEN 11
      WHEN 'federated' THEN 15
      ELSE 4
    END
    +
    CASE training_status
      WHEN 'no' THEN 2
      WHEN 'used-to' THEN 6
      WHEN 'currently' THEN 11
      ELSE 2
    END
    +
    CASE match_experience
      WHEN 'none' THEN 1
      WHEN 'few' THEN 3
      WHEN 'some' THEN 5
      WHEN 'many' THEN 6
      WHEN 'extensive' THEN 7
      ELSE 1
    END
  )),
  rating_history = jsonb_build_array(
    jsonb_build_object(
      'date', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'rating', GREATEST(15, LEAST(75,
        CASE general_skill_level
          WHEN 'just-starting' THEN 4 WHEN 'intermediate' THEN 11
          WHEN 'advanced' THEN 19 WHEN 'competitive' THEN 23 ELSE 4
        END
        + CASE game_performance
          WHEN 'basic-contact' THEN 4 WHEN 'consistent-play' THEN 8
          WHEN 'tactical-aware' THEN 11 WHEN 'advanced-skills' THEN 15
          WHEN 'competitive-level' THEN 19 ELSE 4
        END
        + CASE competition_level
          WHEN 'casual' THEN 4 WHEN 'friendly' THEN 8
          WHEN 'amateur' THEN 11 WHEN 'federated' THEN 15 ELSE 4
        END
        + CASE training_status
          WHEN 'no' THEN 2 WHEN 'used-to' THEN 6
          WHEN 'currently' THEN 11 ELSE 2
        END
        + CASE match_experience
          WHEN 'none' THEN 1 WHEN 'few' THEN 3 WHEN 'some' THEN 5
          WHEN 'many' THEN 6 WHEN 'extensive' THEN 7 ELSE 1
        END
      )),
      'type', 'rescale'
    )
  )
WHERE rating_history IS NULL
  AND general_skill_level IS NOT NULL;
