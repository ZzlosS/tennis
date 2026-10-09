import { z } from "zod";
import { SetScore } from "../responses/matchResponse";
import { scoreProblem } from "../services/tennisScore";
import { id, isoDateTime } from "./common";

const team = z.array(id).min(1).max(2);

const setScore = z.object({
  firstTeam: z.number().int().min(0).max(99),
  secondTeam: z.number().int().min(0).max(99),
});

const sets = z.array(setScore).min(1).max(5);

// A player can be on one team only.
const noSharedPlayers = (match: { firstTeam?: string[]; secondTeam?: string[] }, context: z.RefinementCtx) => {
  const players = [...(match.firstTeam ?? []), ...(match.secondTeam ?? [])];
  if (new Set(players).size !== players.length) {
    context.addIssue({ code: "custom", path: ["secondTeam"], message: "A player can only be on one team" });
  }
};

// The sets have to add up to a real, finished tennis match.
const realScore = (match: { sets?: SetScore[] }, context: z.RefinementCtx) => {
  const problem = match.sets ? scoreProblem(match.sets) : null;
  if (problem) {
    context.addIssue({ code: "custom", path: ["sets"], message: problem });
  }
};

export const createMatchBody = z
  .object({
    firstTeam: team,
    secondTeam: team,
    sets,
    courtId: id,
    playedAt: isoDateTime,
  })
  .superRefine(noSharedPlayers)
  .superRefine(realScore);

export const updateMatchBody = z
  .object({
    firstTeam: team.optional(),
    secondTeam: team.optional(),
    sets: sets.optional(),
    courtId: id.optional(),
    playedAt: isoDateTime.optional(),
  })
  .superRefine(noSharedPlayers)
  .superRefine(realScore);
