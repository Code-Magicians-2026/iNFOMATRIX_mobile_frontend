import { beforeEach, describe, expect, it, vi } from "vitest";

import useAuthStore from "@/context/Auth-store";
import usePlansStore from "@/context/Plans-store";

import { plansService } from "./plansService";

const createResponse = (
  status: number,
  body: unknown,
  contentType = "application/json",
) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "content-type": contentType },
  });

describe("plansService.uploadPhotoAndGenerate", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await usePlansStore.getState().clear();
    useAuthStore.setState({
      session: null,
      currentUser: null,
      role: null,
      selectedChildId: null,
      family: null,
      pendingFamilyName: null,
    });
  });

  it("requires auth token for uploadPhotoAndGenerate", async () => {
    await expect(
      plansService.uploadPhotoAndGenerate({
        targetUserId: "child-1",
        prompt: "Create tidy room and homework plan.",
        category: "routine",
        photo: {
          uri: "file:///camera/room.jpg",
          mimeType: "image/jpeg",
          fileName: "room.jpg",
        },
      }),
    ).rejects.toThrow("Sign in is required to generate AI plans.");
  });

  it("requires auth token for generatePlan", async () => {
    await expect(
      plansService.generatePlan({
        targetUserId: "child-1",
        prompt: "Create tidy room and homework plan.",
      }),
    ).rejects.toThrow("Sign in is required to generate AI plans.");
  });

  it("uses swagger contract /api/ai/quest with Prompt multipart and auth token", async () => {
    useAuthStore.setState({
      session: {
        email: "adult@example.com",
        accessToken: "token-quest",
        refreshToken: null,
        expiresIn: 3600,
        tokenType: "Bearer",
      },
      currentUser: {
        id: "adult-api-1",
        fullName: "Adult API",
        email: "adult@example.com",
        role: "adult",
        level: 1,
        xp: 0,
        streak: 0,
        avatarType: "mentor",
      },
      role: "adult",
    });

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createResponse(200, {
        id: "quest-api-1",
        title: "Focus Sprint",
        description: "Complete one focused study sprint.",
        difficulty: "medium",
        rewardXp: 90,
        estimatedMinutes: 35,
        status: "active",
      }),
    );

    const plan = await plansService.generatePlan({
      targetUserId: "adult-api-1",
      prompt: "Create a focused study quest.",
    });

    expect(plan.status).toBe("approved");
    expect(plan.quests).toHaveLength(1);
    expect(plan.quests[0]?.title).toBe("Focus Sprint");
    expect(plan.quests[0]?.stepsCount).toBeGreaterThan(0);
    expect(plan.totalEstimatedMinutes).toBe(35);

    const [calledUrl, options] = fetchMock.mock.calls[0] ?? [];
    expect(calledUrl).toBe(
      "https://infomatrix-api-cda8ftcucbg8dnfc.germanywestcentral-01.azurewebsites.net/api/ai/quest",
    );

    const headers = options?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer token-quest");

    const body = options?.body as FormData;
    expect(body.get("Prompt")).toBe("Create a focused study quest.");
    expect(body.get("prompt")).toBeNull();
  });

  it("maps full swagger plan payload into one quest with multiple steps and stores it in local zustand cache", async () => {
    useAuthStore.setState({
      session: {
        email: "adult@example.com",
        accessToken: "token-quest",
        refreshToken: "refresh-quest",
        expiresIn: 3600,
        tokenType: "Bearer",
      },
      currentUser: {
        id: "adult-api-1",
        fullName: "Adult API",
        email: "adult@example.com",
        role: "adult",
        level: 1,
        xp: 0,
        streak: 0,
        avatarType: "mentor",
      },
      role: "adult",
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createResponse(200, {
        title: "Quest: The Grand Cleanup After the Gathering",
        summary: "Visual assessment pending user image.",
        childMessage: "Hero, your mission is to restore the realm.",
        quests: [
          {
            title: "Artifact Collection",
            description: "Gather all cups and plates. Return them to kitchen.",
            difficulty: "medium",
            rewardXp: 150,
            estimatedMinutes: 12,
          },
          {
            title: "Surface Polish",
            description: "Wipe down tables and counters.",
            difficulty: "low",
            rewardXp: 100,
            estimatedMinutes: 8,
          },
        ],
        totalEstimatedMinutes: 20,
      }),
    );

    const plan = await plansService.generatePlan({
      targetUserId: "child-api-1",
      prompt: "Clean the room after guests.",
    });

    expect(plan.status).toBe("draft");
    expect(plan.quests).toHaveLength(1);
    expect(plan.quests[0]?.title).toBe(
      "Quest: The Grand Cleanup After the Gathering",
    );
    expect(plan.quests[0]?.stepsCount).toBeGreaterThan(0);
    expect(plan.quests[0]?.stepsCount).toBe(2);
    expect(plan.totalEstimatedMinutes).toBe(20);

    const cachedPlans = await plansService.getPlans({ limit: 10 });
    expect(cachedPlans.some((cachedPlan) => cachedPlan.id === plan.id)).toBe(
      true,
    );
  });

  it("uses swagger contract /api/ai/quest-vision with Prompt + file multipart and auth token", async () => {
    useAuthStore.setState({
      session: {
        email: "adult@example.com",
        accessToken: "token-quest",
        refreshToken: "refresh-quest",
        expiresIn: 3600,
        tokenType: "Bearer",
      },
      currentUser: {
        id: "adult-api-1",
        fullName: "Adult API",
        email: "adult@example.com",
        role: "adult",
        level: 1,
        xp: 0,
        streak: 0,
        avatarType: "mentor",
      },
      role: "adult",
    });

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createResponse(200, {
        title: "Quest: The Grand Cleanup After the Gathering",
        summary: "Visual assessment pending user image.",
        childMessage: "Hero, your mission is to restore the realm.",
        quests: [
          {
            title: "Artifact Collection",
            description: "Gather all cups, plates, and snack remnants.",
            difficulty: "medium",
            rewardXp: 150,
            estimatedMinutes: 12,
          },
          {
            title: "Floor Patrol",
            description: "Sweep or vacuum the floor.",
            difficulty: "medium",
            rewardXp: 130,
            estimatedMinutes: 15,
          },
        ],
        totalEstimatedMinutes: 27,
      }),
    );

    const plan = await plansService.uploadPhotoAndGenerate({
      targetUserId: "child-api-1",
      prompt: "Room cleanup after guests",
      photo: {
        uri: "file:///camera/room.jpg",
        fileName: "room.jpg",
        mimeType: "image/jpeg",
      },
    });

    expect(plan.status).toBe("draft");
    expect(plan.quests).toHaveLength(1);
    expect(plan.quests[0]?.stepsCount).toBe(2);
    expect(plan.quests[0]?.beforePhoto?.uri).toBe("file:///camera/room.jpg");
    expect(plan.quests[0]?.reportPhotoRequired).toBe(true);
    expect(plan.totalEstimatedMinutes).toBe(27);

    const cachedPlans = await plansService.getPlans({ targetUserId: "child-api-1", limit: 10 });
    const cachedQuest = cachedPlans
      .flatMap((item) => item.quests)
      .find((quest) => quest.id === plan.quests[0]?.id);
    expect(cachedQuest?.beforePhoto?.uri).toBe("file:///camera/room.jpg");
    expect(cachedQuest?.reportPhotoRequired).toBe(true);

    const [calledUrl, options] = fetchMock.mock.calls[0] ?? [];
    expect(calledUrl).toBe(
      "https://infomatrix-api-cda8ftcucbg8dnfc.germanywestcentral-01.azurewebsites.net/api/ai/quest-vision",
    );

    const headers = options?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer token-quest");

    const body = options?.body as FormData;
    expect(body.get("Prompt")).toBe("Room cleanup after guests");
    expect(body.get("file")).not.toBeNull();
  });
});
