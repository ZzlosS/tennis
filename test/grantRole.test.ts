import { describe, expect, it } from "vitest";
import Role from "../src/enums/role";
import { grantRole } from "../src/scripts/grantRole";
import { api, bearer, createClub, login, playerWithRole, registerPlayer } from "./helpers";

describe("grant-role script", () => {
  it("makes an ADMIN who must log in again to use the role", async () => {
    const player = await registerPlayer();
    await grantRole(player.email, Role.ADMIN);

    const club = { name: "x", address: "x", description: "", city: "x", country: "x" };
    await api().post("/clubs").set(bearer(player.accessToken)).send(club).expect(403);
    const session = await login(player.email, player.password);
    await api().post("/clubs").set(bearer(session.token)).send(club).expect(200);
  });

  it("makes a CLUB_ADMIN of one club", async () => {
    const admin = await playerWithRole(Role.ADMIN);
    const club = await createClub(admin.token);
    const boss = await playerWithRole(Role.CLUB_ADMIN, club);
    await api().patch(`/clubs/${club}`).set(bearer(boss.token)).send({ name: "Mine" }).expect(200);
  });

  it("needs a club for CLUB_ADMIN and refuses an unknown email or club", async () => {
    const player = await registerPlayer();
    await expect(grantRole(player.email, Role.CLUB_ADMIN)).rejects.toThrow(/--club/);
    await expect(grantRole("nobody@example.com", Role.ADMIN)).rejects.toThrow(/No player/);
    await expect(grantRole(player.email, Role.CLUB_ADMIN, "missing")).rejects.toThrow(/not found/);
    const session = await login(player.email, player.password);
    const club = { name: "x", address: "x", description: "", city: "x", country: "x" };
    await api().post("/clubs").set(bearer(session.token)).send(club).expect(403);
  });
});
