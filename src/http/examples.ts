// Sample responses for the OpenAPI spec, written out as plain literals because tsoa cannot evaluate expressions.
// `npm run mock` serves them, so the app can build its screens before the real API is hosted.

export const authExample = {
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMUpCWDNLN00yIn0.signature",
  expiresIn: 900,
  refreshToken: "9f2c1d7a4b8e4f6a9c3d5e7f1a2b3c4d",
  player: {
    id: "01JBX3K7M2Q8N5R4T6V9W0YZAB",
    firstName: "Marko",
    lastName: "Petrovic",
    nickname: "marko",
    level: "INTERMEDIATE",
    email: "marko@example.com",
    role: "PLAYER",
    address: "Knez Mihailova 5",
    city: "Belgrade",
    country: "Serbia",
  },
};

export const bookingExample = {
  id: "01JBX3K7M2Q8N5R4T6V9W0YZKL",
  startsAt: "2026-11-01T16:00:00.000Z",
  endsAt: "2026-11-01T18:00:00.000Z",
  court: {
    id: "01JBX3K7M2Q8N5R4T6V9W0YZEF",
    name: "Court 1",
    surface: "CLAY",
    clubId: "01JBX3K7M2Q8N5R4T6V9W0YZCD",
  },
  club: {
    id: "01JBX3K7M2Q8N5R4T6V9W0YZCD",
    name: "TK Banjica",
    city: "Belgrade",
  },
  player: {
    id: "01JBX3K7M2Q8N5R4T6V9W0YZAB",
    nickname: "marko",
    level: "INTERMEDIATE",
  },
  totalPrice: {
    amountMinor: 360000,
    currency: "RSD",
  },
  bookingType: "ONE_TIME",
  status: "CONFIRMED",
  seriesId: null,
  paidAt: null,
};

export const bookingPageExample = {
  items: [
    {
      id: "01JBX3K7M2Q8N5R4T6V9W0YZKL",
      startsAt: "2026-11-01T16:00:00.000Z",
      endsAt: "2026-11-01T18:00:00.000Z",
      court: {
        id: "01JBX3K7M2Q8N5R4T6V9W0YZEF",
        name: "Court 1",
        surface: "CLAY",
        clubId: "01JBX3K7M2Q8N5R4T6V9W0YZCD",
      },
      club: {
        id: "01JBX3K7M2Q8N5R4T6V9W0YZCD",
        name: "TK Banjica",
        city: "Belgrade",
      },
      player: {
        id: "01JBX3K7M2Q8N5R4T6V9W0YZAB",
        nickname: "marko",
        level: "INTERMEDIATE",
      },
      totalPrice: {
        amountMinor: 360000,
        currency: "RSD",
      },
      bookingType: "ONE_TIME",
      status: "CONFIRMED",
      seriesId: null,
      paidAt: null,
    },
  ],
  nextCursor: null,
};

export const clubDetailExample = {
  id: "01JBX3K7M2Q8N5R4T6V9W0YZCD",
  name: "TK Banjica",
  address: "Banjicka 1",
  description: "Six clay courts and a clubhouse in Banjica.",
  city: "Belgrade",
  country: "Serbia",
  currency: "RSD",
  courtCount: 6,
  timeZone: "Europe/Belgrade",
  openingHours: [
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
  ],
  cancelCutoffHours: 24,
  seasonEndsOn: null,
  courts: [
    {
      id: "01JBX3K7M2Q8N5R4T6V9W0YZEF",
      name: "Court 1",
      surface: "CLAY",
      stands: false,
      roof: false,
      double: false,
      kind: "CLUB",
      club: {
        id: "01JBX3K7M2Q8N5R4T6V9W0YZCD",
        name: "TK Banjica",
        city: "Belgrade",
      },
      ownerId: null,
      address: "Banjicka 1",
      city: "Belgrade",
      country: "Serbia",
      pricePerHour: {
        amountMinor: 180000,
        currency: "RSD",
      },
      active: true,
      timeZone: "Europe/Belgrade",
      openingHours: [
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
      ],
    },
  ],
};

export const clubExample = {
  id: "01JBX3K7M2Q8N5R4T6V9W0YZCD",
  name: "TK Banjica",
  address: "Banjicka 1",
  description: "Six clay courts and a clubhouse in Banjica.",
  city: "Belgrade",
  country: "Serbia",
  currency: "RSD",
  courtCount: 6,
  timeZone: "Europe/Belgrade",
  openingHours: [
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
  ],
  cancelCutoffHours: 24,
  seasonEndsOn: null,
};

export const clubPageExample = {
  items: [
    {
      id: "01JBX3K7M2Q8N5R4T6V9W0YZCD",
      name: "TK Banjica",
      address: "Banjicka 1",
      description: "Six clay courts and a clubhouse in Banjica.",
      city: "Belgrade",
      country: "Serbia",
      currency: "RSD",
      courtCount: 6,
      timeZone: "Europe/Belgrade",
      openingHours: [
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
      ],
      cancelCutoffHours: 24,
      seasonEndsOn: null,
    },
  ],
  nextCursor: null,
};

export const clubSummaryExample = {
  id: "01JBX3K7M2Q8N5R4T6V9W0YZCD",
  name: "TK Banjica",
  city: "Belgrade",
};

export const courtExample = {
  id: "01JBX3K7M2Q8N5R4T6V9W0YZEF",
  name: "Court 1",
  surface: "CLAY",
  stands: false,
  roof: false,
  double: false,
  kind: "CLUB",
  club: {
    id: "01JBX3K7M2Q8N5R4T6V9W0YZCD",
    name: "TK Banjica",
    city: "Belgrade",
  },
  ownerId: null,
  address: "Banjicka 1",
  city: "Belgrade",
  country: "Serbia",
  pricePerHour: {
    amountMinor: 180000,
    currency: "RSD",
  },
  active: true,
  timeZone: "Europe/Belgrade",
  openingHours: [
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
  ],
};

export const courtPageExample = {
  items: [
    {
      id: "01JBX3K7M2Q8N5R4T6V9W0YZEF",
      name: "Court 1",
      surface: "CLAY",
      stands: false,
      roof: false,
      double: false,
      kind: "CLUB",
      club: {
        id: "01JBX3K7M2Q8N5R4T6V9W0YZCD",
        name: "TK Banjica",
        city: "Belgrade",
      },
      ownerId: null,
      address: "Banjicka 1",
      city: "Belgrade",
      country: "Serbia",
      pricePerHour: {
        amountMinor: 180000,
        currency: "RSD",
      },
      active: true,
      timeZone: "Europe/Belgrade",
      openingHours: [
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
      ],
    },
  ],
  nextCursor: null,
};

export const courtSummaryExample = {
  id: "01JBX3K7M2Q8N5R4T6V9W0YZEF",
  name: "Court 1",
  surface: "CLAY",
  clubId: "01JBX3K7M2Q8N5R4T6V9W0YZCD",
};

export const matchExample = {
  id: "01JBX3K7M2Q8N5R4T6V9W0YZOP",
  firstTeam: [
    {
      id: "01JBX3K7M2Q8N5R4T6V9W0YZAB",
      nickname: "marko",
      level: "INTERMEDIATE",
    },
  ],
  secondTeam: [
    {
      id: "01JBX3K7M2Q8N5R4T6V9W0YZQR",
      nickname: "ana",
      level: "ADVANCED",
    },
  ],
  sets: [
    {
      firstTeam: 6,
      secondTeam: 4,
    },
    {
      firstTeam: 3,
      secondTeam: 6,
    },
    {
      firstTeam: 7,
      secondTeam: 5,
    },
  ],
  playedAt: "2026-10-25T09:00:00.000Z",
  court: {
    id: "01JBX3K7M2Q8N5R4T6V9W0YZEF",
    name: "Court 1",
    surface: "CLAY",
    clubId: "01JBX3K7M2Q8N5R4T6V9W0YZCD",
  },
  club: {
    id: "01JBX3K7M2Q8N5R4T6V9W0YZCD",
    name: "TK Banjica",
    city: "Belgrade",
  },
};

export const matchPageExample = {
  items: [
    {
      id: "01JBX3K7M2Q8N5R4T6V9W0YZOP",
      firstTeam: [
        {
          id: "01JBX3K7M2Q8N5R4T6V9W0YZAB",
          nickname: "marko",
          level: "INTERMEDIATE",
        },
      ],
      secondTeam: [
        {
          id: "01JBX3K7M2Q8N5R4T6V9W0YZQR",
          nickname: "ana",
          level: "ADVANCED",
        },
      ],
      sets: [
        {
          firstTeam: 6,
          secondTeam: 4,
        },
        {
          firstTeam: 3,
          secondTeam: 6,
        },
        {
          firstTeam: 7,
          secondTeam: 5,
        },
      ],
      playedAt: "2026-10-25T09:00:00.000Z",
      court: {
        id: "01JBX3K7M2Q8N5R4T6V9W0YZEF",
        name: "Court 1",
        surface: "CLAY",
        clubId: "01JBX3K7M2Q8N5R4T6V9W0YZCD",
      },
      club: {
        id: "01JBX3K7M2Q8N5R4T6V9W0YZCD",
        name: "TK Banjica",
        city: "Belgrade",
      },
    },
  ],
  nextCursor: null,
};

export const partnerRequestExample = {
  id: "01JBX3K7M2Q8N5R4T6V9W0YZMN",
  booking: {
    id: "01JBX3K7M2Q8N5R4T6V9W0YZKL",
    startsAt: "2026-11-01T16:00:00.000Z",
    endsAt: "2026-11-01T18:00:00.000Z",
    court: {
      id: "01JBX3K7M2Q8N5R4T6V9W0YZEF",
      name: "Court 1",
      surface: "CLAY",
      clubId: "01JBX3K7M2Q8N5R4T6V9W0YZCD",
    },
    club: {
      id: "01JBX3K7M2Q8N5R4T6V9W0YZCD",
      name: "TK Banjica",
      city: "Belgrade",
    },
  },
  createdBy: {
    id: "01JBX3K7M2Q8N5R4T6V9W0YZAB",
    nickname: "marko",
    level: "INTERMEDIATE",
  },
  playersNeeded: 1,
  joined: [],
  status: "OPEN",
};

export const partnerRequestPageExample = {
  items: [
    {
      id: "01JBX3K7M2Q8N5R4T6V9W0YZMN",
      booking: {
        id: "01JBX3K7M2Q8N5R4T6V9W0YZKL",
        startsAt: "2026-11-01T16:00:00.000Z",
        endsAt: "2026-11-01T18:00:00.000Z",
        court: {
          id: "01JBX3K7M2Q8N5R4T6V9W0YZEF",
          name: "Court 1",
          surface: "CLAY",
          clubId: "01JBX3K7M2Q8N5R4T6V9W0YZCD",
        },
        club: {
          id: "01JBX3K7M2Q8N5R4T6V9W0YZCD",
          name: "TK Banjica",
          city: "Belgrade",
        },
      },
      createdBy: {
        id: "01JBX3K7M2Q8N5R4T6V9W0YZAB",
        nickname: "marko",
        level: "INTERMEDIATE",
      },
      playersNeeded: 1,
      joined: [],
      status: "OPEN",
    },
  ],
  nextCursor: null,
};

export const playerExample = {
  id: "01JBX3K7M2Q8N5R4T6V9W0YZAB",
  firstName: "Marko",
  lastName: "Petrovic",
  nickname: "marko",
  level: "INTERMEDIATE",
  email: "marko@example.com",
  address: "Knez Mihailova 5",
  city: "Belgrade",
  country: "Serbia",
};

export const playerPageExample = {
  items: [
    {
      id: "01JBX3K7M2Q8N5R4T6V9W0YZAB",
      firstName: "Marko",
      lastName: "Petrovic",
      nickname: "marko",
      level: "INTERMEDIATE",
      email: "marko@example.com",
      address: "Knez Mihailova 5",
      city: "Belgrade",
      country: "Serbia",
    },
  ],
  nextCursor: null,
};

export const playerSummaryExample = {
  id: "01JBX3K7M2Q8N5R4T6V9W0YZAB",
  nickname: "marko",
  level: "INTERMEDIATE",
};

export const publicCourtExample = {
  id: "01JBX3K7M2Q8N5R4T6V9W0YZIJ",
  name: "Kalemegdan park court",
  surface: "HARD",
  stands: false,
  roof: false,
  double: false,
  kind: "PUBLIC",
  club: null,
  ownerId: "01JBX3K7M2Q8N5R4T6V9W0YZAB",
  address: "Kalemegdan",
  city: "Belgrade",
  country: "Serbia",
  pricePerHour: null,
  active: true,
  timeZone: "Europe/Belgrade",
  openingHours: [
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
    { open: "06:00", close: "23:00" },
  ],
};

export const publicCourtPageExample = {
  items: [
    {
      id: "01JBX3K7M2Q8N5R4T6V9W0YZIJ",
      name: "Kalemegdan park court",
      surface: "HARD",
      stands: false,
      roof: false,
      double: false,
      kind: "PUBLIC",
      club: null,
      ownerId: "01JBX3K7M2Q8N5R4T6V9W0YZAB",
      address: "Kalemegdan",
      city: "Belgrade",
      country: "Serbia",
      pricePerHour: null,
      active: true,
      timeZone: "Europe/Belgrade",
      openingHours: [
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
        { open: "06:00", close: "23:00" },
      ],
    },
  ],
  nextCursor: null,
};

export const racketExample = {
  id: "01JBX3K7M2Q8N5R4T6V9W0YZGH",
  brand: "Wilson",
  model: "Pro Staff 97",
  year: 2018,
  weight: 315,
  level: "PROFESSIONAL",
  headSizeInch: 97,
  balance: 9,
  stringPattern: "16x19",
  recommendedStrings: "Luxilon Alu Power",
};

export const racketPageExample = {
  items: [
    {
      id: "01JBX3K7M2Q8N5R4T6V9W0YZGH",
      brand: "Wilson",
      model: "Pro Staff 97",
      year: 2018,
      weight: 315,
      level: "PROFESSIONAL",
      headSizeInch: 97,
      balance: 9,
      stringPattern: "16x19",
      recommendedStrings: "Luxilon Alu Power",
    },
  ],
  nextCursor: null,
};

export const availabilityExample = {
  courtId: "01JBX3K7M2Q8N5R4T6V9W0YZEF",
  date: "2026-11-01",
  timeZone: "Europe/Belgrade",
  pricePerHour: {
    amountMinor: 180000,
    currency: "RSD",
  },
  slots: [
    {
      startsAt: "2026-11-01T04:00:00.000Z",
      endsAt: "2026-11-01T05:00:00.000Z",
      localTime: "05:00",
      status: "CLOSED",
    },
    {
      startsAt: "2026-11-01T16:00:00.000Z",
      endsAt: "2026-11-01T17:00:00.000Z",
      localTime: "17:00",
      status: "BOOKED",
    },
    {
      startsAt: "2026-11-01T17:00:00.000Z",
      endsAt: "2026-11-01T18:00:00.000Z",
      localTime: "18:00",
      status: "FREE",
    },
  ],
};
