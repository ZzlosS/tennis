import { describe, expect, it } from "vitest";
import { api, bearer, registerPlayer } from "./helpers";

const search = async (token: string, q: string) =>
  (
    (
      await api()
        .get(`/players?q=${encodeURIComponent(q)}`)
        .set(bearer(token))
        .expect(200)
    ).body.items as {
      nickname: string;
    }[]
  ).map((player) => player.nickname);

describe("finding a player by name", () => {
  it("matches the start of the first name, last name or nickname, every word", async () => {
    const me = await registerPlayer({ firstName: "Ana", lastName: "Ivanović", nickname: "anai" });
    await registerPlayer({ firstName: "Marko", lastName: "Petrović", nickname: "mare" });
    await registerPlayer({ firstName: "Marija", lastName: "Jovanović", nickname: "maja" });

    expect((await search(me.accessToken, "mar")).sort()).toEqual(["maja", "mare"]);
    expect(await search(me.accessToken, "mar pet")).toEqual(["mare"]);
    expect(await search(me.accessToken, "MAJA")).toEqual(["maja"]);
    expect(await search(me.accessToken, "ivanov")).toEqual(["anai"]);
    expect(await search(me.accessToken, "zzz")).toEqual([]);
  });

  it("finds a renamed player by the new name", async () => {
    const me = await registerPlayer({ firstName: "Ana", nickname: "anai" });
    await api().patch("/me").set(bearer(me.accessToken)).send({ nickname: "lefty" }).expect(200);
    expect(await search(me.accessToken, "left")).toEqual(["lefty"]);
    expect(await search(me.accessToken, "anai")).toEqual([]);
  });

  it("reads query syntax as plain text", async () => {
    const me = await registerPlayer({ firstName: "Ana", nickname: "anai" });
    expect(await search(me.accessToken, "@firstName:{*} | -(")).toEqual([]);
    expect(await search(me.accessToken, "an*")).toEqual(["anai"]);
  });
});
