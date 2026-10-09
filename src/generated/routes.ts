/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { RacketController } from './../controller/racketController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PlayerRacketController } from './../controller/playerRacketController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PlayerController } from './../controller/playerController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PartnerRequestController } from './../controller/partnerRequestController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { MatchController } from './../controller/matchController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { CourtController } from './../controller/courtController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ClubCourtController } from './../controller/clubCourtController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ClubController } from './../controller/clubController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { BookingController } from './../controller/bookingController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { AuthController } from './../controller/authController';
import { expressAuthentication } from './../middleware/tsoaAuth';
// @ts-ignore - no great way to install types from subpackage
import type { Request as ExRequest, Response as ExResponse, RequestHandler, Router } from 'express';

const expressAuthenticationRecasted = expressAuthentication as (req: ExRequest, securityName: string, scopes?: string[], res?: ExResponse) => Promise<any>;


// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
    "ErrorCode": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["VALIDATION_FAILED"]},{"dataType":"enum","enums":["UNAUTHENTICATED"]},{"dataType":"enum","enums":["TOKEN_EXPIRED"]},{"dataType":"enum","enums":["INVALID_CREDENTIALS"]},{"dataType":"enum","enums":["FORBIDDEN"]},{"dataType":"enum","enums":["NOT_FOUND"]},{"dataType":"enum","enums":["EMAIL_TAKEN"]},{"dataType":"enum","enums":["CONFLICT"]},{"dataType":"enum","enums":["INTERNAL"]},{"dataType":"enum","enums":["SLOT_TAKEN"]},{"dataType":"enum","enums":["OUTSIDE_OPENING_HOURS"]},{"dataType":"enum","enums":["COURT_CLOSED"]},{"dataType":"enum","enums":["BOOKING_IN_PAST"]},{"dataType":"enum","enums":["CANCEL_TOO_LATE"]},{"dataType":"enum","enums":["REQUEST_FULL"]},{"dataType":"enum","enums":["ALREADY_JOINED"]},{"dataType":"enum","enums":["MATCH_NOT_PENDING"]},{"dataType":"enum","enums":["HANDOVER_PENDING"]},{"dataType":"enum","enums":["RATE_LIMITED"]},{"dataType":"enum","enums":["TOKEN_INVALID"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ErrorBody": {
        "dataType": "refObject",
        "properties": {
            "error": {"dataType":"nestedObjectLiteral","nestedProperties":{"fields":{"dataType":"nestedObjectLiteral","nestedProperties":{},"additionalProperties":{"dataType":"array","array":{"dataType":"string"}}},"message":{"dataType":"string","required":true},"code":{"ref":"ErrorCode","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RacketLevels": {
        "dataType": "refEnum",
        "enums": ["JUNIOR","RECREATIONAL","PROFESSIONAL"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RacketResponse": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "brand": {"dataType":"string","required":true},
            "model": {"dataType":"string","required":true},
            "year": {"dataType":"double","required":true},
            "weight": {"dataType":"double","required":true},
            "level": {"ref":"RacketLevels","required":true},
            "headSizeInch": {"dataType":"double","required":true},
            "balance": {"dataType":"double","required":true},
            "stringPattern": {"dataType":"string","required":true},
            "recommendedStrings": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Page_RacketResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"RacketResponse"},"required":true},
            "nextCursor": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateRacketRequest": {
        "dataType": "refObject",
        "properties": {
            "brand": {"dataType":"string","required":true},
            "model": {"dataType":"string","required":true},
            "year": {"dataType":"double","required":true},
            "weight": {"dataType":"double","required":true},
            "level": {"ref":"RacketLevels","required":true},
            "headSizeInch": {"dataType":"double","required":true},
            "balance": {"dataType":"double","required":true},
            "stringPattern": {"dataType":"string","required":true},
            "recommendedStrings": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateRacketRequest": {
        "dataType": "refObject",
        "properties": {
            "brand": {"dataType":"string"},
            "model": {"dataType":"string"},
            "year": {"dataType":"double"},
            "weight": {"dataType":"double"},
            "level": {"ref":"RacketLevels"},
            "headSizeInch": {"dataType":"double"},
            "balance": {"dataType":"double"},
            "stringPattern": {"dataType":"string"},
            "recommendedStrings": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PlayerLevel": {
        "dataType": "refEnum",
        "enums": ["NEWBIE","BEGINNER","INTERMEDIATE","ADVANCED","PRO"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PlayerResponse": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "firstName": {"dataType":"string","required":true},
            "lastName": {"dataType":"string","required":true},
            "nickname": {"dataType":"string","required":true},
            "level": {"ref":"PlayerLevel","required":true},
            "address": {"dataType":"string","required":true},
            "email": {"dataType":"string"},
            "city": {"dataType":"string","required":true},
            "country": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Page_PlayerResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"PlayerResponse"},"required":true},
            "nextCursor": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdatePlayerRequest": {
        "dataType": "refObject",
        "properties": {
            "firstName": {"dataType":"string"},
            "lastName": {"dataType":"string"},
            "level": {"ref":"PlayerLevel"},
            "address": {"dataType":"string"},
            "city": {"dataType":"string"},
            "country": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CourtSurface": {
        "dataType": "refEnum",
        "enums": ["GRASS","CLAY","HARD"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CourtSummary": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "surface": {"ref":"CourtSurface","required":true},
            "clubId": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ClubSummary": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "city": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PartnerRequestBooking": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "startsAt": {"dataType":"string","required":true},
            "endsAt": {"dataType":"string","required":true},
            "court": {"ref":"CourtSummary","required":true},
            "club": {"dataType":"union","subSchemas":[{"ref":"ClubSummary"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PlayerSummary": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "nickname": {"dataType":"string","required":true},
            "level": {"ref":"PlayerLevel","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RequestStatus": {
        "dataType": "refEnum",
        "enums": ["OPEN","CLOSED"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PartnerRequestResponse": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "booking": {"ref":"PartnerRequestBooking","required":true},
            "createdBy": {"ref":"PlayerSummary","required":true},
            "playersNeeded": {"dataType":"double","required":true},
            "joined": {"dataType":"array","array":{"dataType":"refObject","ref":"PlayerSummary"},"required":true},
            "status": {"ref":"RequestStatus","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreatePartnerRequest": {
        "dataType": "refObject",
        "properties": {
            "bookingId": {"dataType":"string","required":true},
            "playersNeeded": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Page_PartnerRequestResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"PartnerRequestResponse"},"required":true},
            "nextCursor": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdatePartnerRequest": {
        "dataType": "refObject",
        "properties": {
            "bookingId": {"dataType":"string"},
            "playersNeeded": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SetScore": {
        "dataType": "refObject",
        "properties": {
            "firstTeam": {"dataType":"double","required":true},
            "secondTeam": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MatchResponse": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "firstTeam": {"dataType":"array","array":{"dataType":"refObject","ref":"PlayerSummary"},"required":true},
            "secondTeam": {"dataType":"array","array":{"dataType":"refObject","ref":"PlayerSummary"},"required":true},
            "sets": {"dataType":"array","array":{"dataType":"refObject","ref":"SetScore"},"required":true},
            "playedAt": {"dataType":"string","required":true},
            "court": {"ref":"CourtSummary","required":true},
            "club": {"dataType":"union","subSchemas":[{"ref":"ClubSummary"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Page_MatchResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"MatchResponse"},"required":true},
            "nextCursor": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateMatchRequest": {
        "dataType": "refObject",
        "properties": {
            "firstTeam": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "secondTeam": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "sets": {"dataType":"array","array":{"dataType":"refObject","ref":"SetScore"},"required":true},
            "courtId": {"dataType":"string","required":true},
            "playedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateMatchRequest": {
        "dataType": "refObject",
        "properties": {
            "firstTeam": {"dataType":"array","array":{"dataType":"string"}},
            "secondTeam": {"dataType":"array","array":{"dataType":"string"}},
            "sets": {"dataType":"array","array":{"dataType":"refObject","ref":"SetScore"}},
            "courtId": {"dataType":"string"},
            "playedAt": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CourtKind": {
        "dataType": "refEnum",
        "enums": ["CLUB","PUBLIC","PRIVATE"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Money": {
        "dataType": "refObject",
        "properties": {
            "amountMinor": {"dataType":"double","required":true},
            "currency": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CourtResponse": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "surface": {"ref":"CourtSurface","required":true},
            "stands": {"dataType":"boolean","required":true},
            "roof": {"dataType":"boolean","required":true},
            "double": {"dataType":"boolean","required":true},
            "kind": {"ref":"CourtKind","required":true},
            "club": {"dataType":"union","subSchemas":[{"ref":"ClubSummary"},{"dataType":"enum","enums":[null]}],"required":true},
            "ownerId": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "address": {"dataType":"string","required":true},
            "city": {"dataType":"string","required":true},
            "country": {"dataType":"string","required":true},
            "pricePerHour": {"dataType":"union","subSchemas":[{"ref":"Money"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Page_CourtResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"CourtResponse"},"required":true},
            "nextCursor": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StandaloneCourtCreateRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true},
            "surface": {"ref":"CourtSurface","required":true},
            "stands": {"dataType":"boolean","required":true},
            "roof": {"dataType":"boolean","required":true},
            "double": {"dataType":"boolean","required":true},
            "kind": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["PUBLIC"]},{"dataType":"enum","enums":["PRIVATE"]}],"required":true},
            "address": {"dataType":"string","required":true},
            "city": {"dataType":"string","required":true},
            "country": {"dataType":"string","required":true},
            "currency": {"dataType":"string"},
            "pricePerHourMinor": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AssignCourtRequest": {
        "dataType": "refObject",
        "properties": {
            "clubId": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateCourtRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string"},
            "surface": {"ref":"CourtSurface"},
            "stands": {"dataType":"boolean"},
            "roof": {"dataType":"boolean"},
            "double": {"dataType":"boolean"},
            "pricePerHourMinor": {"dataType":"double"},
            "address": {"dataType":"string"},
            "city": {"dataType":"string"},
            "country": {"dataType":"string"},
            "currency": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CourtCreateRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true},
            "surface": {"ref":"CourtSurface","required":true},
            "stands": {"dataType":"boolean","required":true},
            "roof": {"dataType":"boolean","required":true},
            "double": {"dataType":"boolean","required":true},
            "pricePerHourMinor": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ClubResponse": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "address": {"dataType":"string","required":true},
            "description": {"dataType":"string","required":true},
            "city": {"dataType":"string","required":true},
            "country": {"dataType":"string","required":true},
            "currency": {"dataType":"string","required":true},
            "courtCount": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Page_ClubResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"ClubResponse"},"required":true},
            "nextCursor": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ClubCreateRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true},
            "address": {"dataType":"string","required":true},
            "description": {"dataType":"string","required":true},
            "city": {"dataType":"string","required":true},
            "country": {"dataType":"string","required":true},
            "currency": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ClubDetailResponse": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "address": {"dataType":"string","required":true},
            "description": {"dataType":"string","required":true},
            "city": {"dataType":"string","required":true},
            "country": {"dataType":"string","required":true},
            "currency": {"dataType":"string","required":true},
            "courtCount": {"dataType":"double","required":true},
            "courts": {"dataType":"array","array":{"dataType":"refObject","ref":"CourtResponse"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateClubRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string"},
            "address": {"dataType":"string"},
            "description": {"dataType":"string"},
            "city": {"dataType":"string"},
            "country": {"dataType":"string"},
            "currency": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BookingType": {
        "dataType": "refEnum",
        "enums": ["ONE_TIME","MONTH","SEASON"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BookingResponse": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "startsAt": {"dataType":"string","required":true},
            "endsAt": {"dataType":"string","required":true},
            "court": {"ref":"CourtSummary","required":true},
            "club": {"dataType":"union","subSchemas":[{"ref":"ClubSummary"},{"dataType":"enum","enums":[null]}],"required":true},
            "player": {"ref":"PlayerSummary","required":true},
            "totalPrice": {"dataType":"union","subSchemas":[{"ref":"Money"},{"dataType":"enum","enums":[null]}],"required":true},
            "bookingType": {"ref":"BookingType","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BookingCreateRequest": {
        "dataType": "refObject",
        "properties": {
            "courtId": {"dataType":"string","required":true},
            "startsAt": {"dataType":"string","required":true},
            "endsAt": {"dataType":"string","required":true},
            "bookingType": {"ref":"BookingType","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Page_BookingResponse_": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"BookingResponse"},"required":true},
            "nextCursor": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateBookingRequest": {
        "dataType": "refObject",
        "properties": {
            "courtId": {"dataType":"string"},
            "startsAt": {"dataType":"string"},
            "endsAt": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Role": {
        "dataType": "refEnum",
        "enums": ["PLAYER","CLUB_ADMIN","ADMIN"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AuthPlayerResponse": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "firstName": {"dataType":"string","required":true},
            "lastName": {"dataType":"string","required":true},
            "nickname": {"dataType":"string","required":true},
            "email": {"dataType":"string","required":true},
            "level": {"ref":"PlayerLevel","required":true},
            "role": {"ref":"Role","required":true},
            "address": {"dataType":"string","required":true},
            "city": {"dataType":"string","required":true},
            "country": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AuthResponse": {
        "dataType": "refObject",
        "properties": {
            "accessToken": {"dataType":"string","required":true},
            "expiresIn": {"dataType":"double","required":true},
            "refreshToken": {"dataType":"string","required":true},
            "player": {"ref":"AuthPlayerResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RegisterRequest": {
        "dataType": "refObject",
        "properties": {
            "firstName": {"dataType":"string","required":true},
            "lastName": {"dataType":"string","required":true},
            "email": {"dataType":"string","required":true},
            "password": {"dataType":"string","required":true},
            "nickname": {"dataType":"string"},
            "level": {"ref":"PlayerLevel","required":true},
            "address": {"dataType":"string","required":true},
            "city": {"dataType":"string","required":true},
            "country": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LoginRequest": {
        "dataType": "refObject",
        "properties": {
            "email": {"dataType":"string","required":true},
            "password": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RefreshRequest": {
        "dataType": "refObject",
        "properties": {
            "refreshToken": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const templateService = new ExpressTemplateService(models, {"noImplicitAdditionalProperties":"silently-remove-extras","bodyCoercion":true});

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa




export function RegisterRoutes(app: Router) {

    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################


    
        const argsRacketController_getRackets: Record<string, TsoaRoute.ParameterSchema> = {
                limit: {"in":"query","name":"limit","dataType":"double"},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/v1/rackets',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(RacketController)),
            ...(fetchMiddlewares<RequestHandler>(RacketController.prototype.getRackets)),

            async function RacketController_getRackets(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsRacketController_getRackets, request, response });

                const controller = new RacketController();

              await templateService.apiHandler({
                methodName: 'getRackets',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsRacketController_getRacket: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/v1/rackets/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(RacketController)),
            ...(fetchMiddlewares<RequestHandler>(RacketController.prototype.getRacket)),

            async function RacketController_getRacket(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsRacketController_getRacket, request, response });

                const controller = new RacketController();

              await templateService.apiHandler({
                methodName: 'getRacket',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsRacketController_createRacket: Record<string, TsoaRoute.ParameterSchema> = {
                createRacket: {"in":"body","name":"createRacket","required":true,"ref":"CreateRacketRequest"},
        };
        app.post('/v1/rackets',
            authenticateMiddleware([{"jwt":["ADMIN"]}]),
            ...(fetchMiddlewares<RequestHandler>(RacketController)),
            ...(fetchMiddlewares<RequestHandler>(RacketController.prototype.createRacket)),

            async function RacketController_createRacket(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsRacketController_createRacket, request, response });

                const controller = new RacketController();

              await templateService.apiHandler({
                methodName: 'createRacket',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsRacketController_updateRacket: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                updateRequest: {"in":"body","name":"updateRequest","required":true,"ref":"UpdateRacketRequest"},
        };
        app.patch('/v1/rackets/:id',
            authenticateMiddleware([{"jwt":["ADMIN"]}]),
            ...(fetchMiddlewares<RequestHandler>(RacketController)),
            ...(fetchMiddlewares<RequestHandler>(RacketController.prototype.updateRacket)),

            async function RacketController_updateRacket(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsRacketController_updateRacket, request, response });

                const controller = new RacketController();

              await templateService.apiHandler({
                methodName: 'updateRacket',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsRacketController_deleteRacket: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/v1/rackets/:id',
            authenticateMiddleware([{"jwt":["ADMIN"]}]),
            ...(fetchMiddlewares<RequestHandler>(RacketController)),
            ...(fetchMiddlewares<RequestHandler>(RacketController.prototype.deleteRacket)),

            async function RacketController_deleteRacket(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsRacketController_deleteRacket, request, response });

                const controller = new RacketController();

              await templateService.apiHandler({
                methodName: 'deleteRacket',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPlayerRacketController_getPlayerRackets: Record<string, TsoaRoute.ParameterSchema> = {
                playerId: {"in":"path","name":"playerId","required":true,"dataType":"string"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/v1/players/:playerId/rackets',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PlayerRacketController)),
            ...(fetchMiddlewares<RequestHandler>(PlayerRacketController.prototype.getPlayerRackets)),

            async function PlayerRacketController_getPlayerRackets(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPlayerRacketController_getPlayerRackets, request, response });

                const controller = new PlayerRacketController();

              await templateService.apiHandler({
                methodName: 'getPlayerRackets',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPlayerRacketController_addRacket: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                playerId: {"in":"path","name":"playerId","required":true,"dataType":"string"},
                racketId: {"in":"path","name":"racketId","required":true,"dataType":"string"},
        };
        app.put('/v1/players/:playerId/rackets/:racketId',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PlayerRacketController)),
            ...(fetchMiddlewares<RequestHandler>(PlayerRacketController.prototype.addRacket)),

            async function PlayerRacketController_addRacket(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPlayerRacketController_addRacket, request, response });

                const controller = new PlayerRacketController();

              await templateService.apiHandler({
                methodName: 'addRacket',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 204,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPlayerRacketController_removeRacket: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                playerId: {"in":"path","name":"playerId","required":true,"dataType":"string"},
                racketId: {"in":"path","name":"racketId","required":true,"dataType":"string"},
        };
        app.delete('/v1/players/:playerId/rackets/:racketId',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PlayerRacketController)),
            ...(fetchMiddlewares<RequestHandler>(PlayerRacketController.prototype.removeRacket)),

            async function PlayerRacketController_removeRacket(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPlayerRacketController_removeRacket, request, response });

                const controller = new PlayerRacketController();

              await templateService.apiHandler({
                methodName: 'removeRacket',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPlayerController_getPlayers: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                city: {"in":"query","name":"city","dataType":"string"},
                level: {"in":"query","name":"level","ref":"PlayerLevel"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/v1/players',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PlayerController)),
            ...(fetchMiddlewares<RequestHandler>(PlayerController.prototype.getPlayers)),

            async function PlayerController_getPlayers(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPlayerController_getPlayers, request, response });

                const controller = new PlayerController();

              await templateService.apiHandler({
                methodName: 'getPlayers',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPlayerController_getPlayer: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/v1/players/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PlayerController)),
            ...(fetchMiddlewares<RequestHandler>(PlayerController.prototype.getPlayer)),

            async function PlayerController_getPlayer(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPlayerController_getPlayer, request, response });

                const controller = new PlayerController();

              await templateService.apiHandler({
                methodName: 'getPlayer',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPlayerController_updatePlayer: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                updateRequest: {"in":"body","name":"updateRequest","required":true,"ref":"UpdatePlayerRequest"},
        };
        app.patch('/v1/players/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PlayerController)),
            ...(fetchMiddlewares<RequestHandler>(PlayerController.prototype.updatePlayer)),

            async function PlayerController_updatePlayer(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPlayerController_updatePlayer, request, response });

                const controller = new PlayerController();

              await templateService.apiHandler({
                methodName: 'updatePlayer',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPlayerController_deletePlayer: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/v1/players/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PlayerController)),
            ...(fetchMiddlewares<RequestHandler>(PlayerController.prototype.deletePlayer)),

            async function PlayerController_deletePlayer(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPlayerController_deletePlayer, request, response });

                const controller = new PlayerController();

              await templateService.apiHandler({
                methodName: 'deletePlayer',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPartnerRequestController_createPartnerRequest: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                createRequest: {"in":"body","name":"createRequest","required":true,"ref":"CreatePartnerRequest"},
        };
        app.post('/v1/partner-requests',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PartnerRequestController)),
            ...(fetchMiddlewares<RequestHandler>(PartnerRequestController.prototype.createPartnerRequest)),

            async function PartnerRequestController_createPartnerRequest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPartnerRequestController_createPartnerRequest, request, response });

                const controller = new PartnerRequestController();

              await templateService.apiHandler({
                methodName: 'createPartnerRequest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPartnerRequestController_getPartnerRequests: Record<string, TsoaRoute.ParameterSchema> = {
                status: {"in":"query","name":"status","ref":"RequestStatus"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/v1/partner-requests',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PartnerRequestController)),
            ...(fetchMiddlewares<RequestHandler>(PartnerRequestController.prototype.getPartnerRequests)),

            async function PartnerRequestController_getPartnerRequests(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPartnerRequestController_getPartnerRequests, request, response });

                const controller = new PartnerRequestController();

              await templateService.apiHandler({
                methodName: 'getPartnerRequests',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPartnerRequestController_getPartnerRequest: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/v1/partner-requests/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PartnerRequestController)),
            ...(fetchMiddlewares<RequestHandler>(PartnerRequestController.prototype.getPartnerRequest)),

            async function PartnerRequestController_getPartnerRequest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPartnerRequestController_getPartnerRequest, request, response });

                const controller = new PartnerRequestController();

              await templateService.apiHandler({
                methodName: 'getPartnerRequest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPartnerRequestController_updatePartnerRequest: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                updateRequest: {"in":"body","name":"updateRequest","required":true,"ref":"UpdatePartnerRequest"},
        };
        app.patch('/v1/partner-requests/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PartnerRequestController)),
            ...(fetchMiddlewares<RequestHandler>(PartnerRequestController.prototype.updatePartnerRequest)),

            async function PartnerRequestController_updatePartnerRequest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPartnerRequestController_updatePartnerRequest, request, response });

                const controller = new PartnerRequestController();

              await templateService.apiHandler({
                methodName: 'updatePartnerRequest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPartnerRequestController_deletePartnerRequest: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/v1/partner-requests/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PartnerRequestController)),
            ...(fetchMiddlewares<RequestHandler>(PartnerRequestController.prototype.deletePartnerRequest)),

            async function PartnerRequestController_deletePartnerRequest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPartnerRequestController_deletePartnerRequest, request, response });

                const controller = new PartnerRequestController();

              await templateService.apiHandler({
                methodName: 'deletePartnerRequest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPartnerRequestController_joinPartnerRequest: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.post('/v1/partner-requests/:id/join',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PartnerRequestController)),
            ...(fetchMiddlewares<RequestHandler>(PartnerRequestController.prototype.joinPartnerRequest)),

            async function PartnerRequestController_joinPartnerRequest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPartnerRequestController_joinPartnerRequest, request, response });

                const controller = new PartnerRequestController();

              await templateService.apiHandler({
                methodName: 'joinPartnerRequest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMatchController_getMatches: Record<string, TsoaRoute.ParameterSchema> = {
                playerId: {"in":"query","name":"playerId","dataType":"string"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/v1/matches',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MatchController)),
            ...(fetchMiddlewares<RequestHandler>(MatchController.prototype.getMatches)),

            async function MatchController_getMatches(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMatchController_getMatches, request, response });

                const controller = new MatchController();

              await templateService.apiHandler({
                methodName: 'getMatches',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMatchController_getMatch: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/v1/matches/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MatchController)),
            ...(fetchMiddlewares<RequestHandler>(MatchController.prototype.getMatch)),

            async function MatchController_getMatch(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMatchController_getMatch, request, response });

                const controller = new MatchController();

              await templateService.apiHandler({
                methodName: 'getMatch',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMatchController_createMatch: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                createMatch: {"in":"body","name":"createMatch","required":true,"ref":"CreateMatchRequest"},
        };
        app.post('/v1/matches',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MatchController)),
            ...(fetchMiddlewares<RequestHandler>(MatchController.prototype.createMatch)),

            async function MatchController_createMatch(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMatchController_createMatch, request, response });

                const controller = new MatchController();

              await templateService.apiHandler({
                methodName: 'createMatch',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMatchController_updateMatch: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                updateRequest: {"in":"body","name":"updateRequest","required":true,"ref":"UpdateMatchRequest"},
        };
        app.patch('/v1/matches/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MatchController)),
            ...(fetchMiddlewares<RequestHandler>(MatchController.prototype.updateMatch)),

            async function MatchController_updateMatch(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMatchController_updateMatch, request, response });

                const controller = new MatchController();

              await templateService.apiHandler({
                methodName: 'updateMatch',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMatchController_deleteMatch: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/v1/matches/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MatchController)),
            ...(fetchMiddlewares<RequestHandler>(MatchController.prototype.deleteMatch)),

            async function MatchController_deleteMatch(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMatchController_deleteMatch, request, response });

                const controller = new MatchController();

              await templateService.apiHandler({
                methodName: 'deleteMatch',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCourtController_getCourts: Record<string, TsoaRoute.ParameterSchema> = {
                kind: {"in":"query","name":"kind","ref":"CourtKind"},
                city: {"in":"query","name":"city","dataType":"string"},
                surface: {"in":"query","name":"surface","ref":"CourtSurface"},
                minPrice: {"in":"query","name":"minPrice","dataType":"double"},
                maxPrice: {"in":"query","name":"maxPrice","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/v1/courts',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourtController)),
            ...(fetchMiddlewares<RequestHandler>(CourtController.prototype.getCourts)),

            async function CourtController_getCourts(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourtController_getCourts, request, response });

                const controller = new CourtController();

              await templateService.apiHandler({
                methodName: 'getCourts',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCourtController_getUnassignedCourts: Record<string, TsoaRoute.ParameterSchema> = {
                city: {"in":"query","name":"city","dataType":"string"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/v1/courts/unassigned',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourtController)),
            ...(fetchMiddlewares<RequestHandler>(CourtController.prototype.getUnassignedCourts)),

            async function CourtController_getUnassignedCourts(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourtController_getUnassignedCourts, request, response });

                const controller = new CourtController();

              await templateService.apiHandler({
                methodName: 'getUnassignedCourts',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCourtController_createCourt: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                createCourt: {"in":"body","name":"createCourt","required":true,"ref":"StandaloneCourtCreateRequest"},
        };
        app.post('/v1/courts',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourtController)),
            ...(fetchMiddlewares<RequestHandler>(CourtController.prototype.createCourt)),

            async function CourtController_createCourt(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourtController_createCourt, request, response });

                const controller = new CourtController();

              await templateService.apiHandler({
                methodName: 'createCourt',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCourtController_getCourt: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/v1/courts/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourtController)),
            ...(fetchMiddlewares<RequestHandler>(CourtController.prototype.getCourt)),

            async function CourtController_getCourt(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourtController_getCourt, request, response });

                const controller = new CourtController();

              await templateService.apiHandler({
                methodName: 'getCourt',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCourtController_assignCourtToClub: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                assignRequest: {"in":"body","name":"assignRequest","required":true,"ref":"AssignCourtRequest"},
        };
        app.post('/v1/courts/:id/assign',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourtController)),
            ...(fetchMiddlewares<RequestHandler>(CourtController.prototype.assignCourtToClub)),

            async function CourtController_assignCourtToClub(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourtController_assignCourtToClub, request, response });

                const controller = new CourtController();

              await templateService.apiHandler({
                methodName: 'assignCourtToClub',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCourtController_updateCourt: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                updateRequest: {"in":"body","name":"updateRequest","required":true,"ref":"UpdateCourtRequest"},
        };
        app.patch('/v1/courts/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourtController)),
            ...(fetchMiddlewares<RequestHandler>(CourtController.prototype.updateCourt)),

            async function CourtController_updateCourt(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourtController_updateCourt, request, response });

                const controller = new CourtController();

              await templateService.apiHandler({
                methodName: 'updateCourt',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCourtController_deleteCourt: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/v1/courts/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CourtController)),
            ...(fetchMiddlewares<RequestHandler>(CourtController.prototype.deleteCourt)),

            async function CourtController_deleteCourt(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCourtController_deleteCourt, request, response });

                const controller = new CourtController();

              await templateService.apiHandler({
                methodName: 'deleteCourt',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsClubCourtController_getClubCourts: Record<string, TsoaRoute.ParameterSchema> = {
                clubId: {"in":"path","name":"clubId","required":true,"dataType":"string"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/v1/clubs/:clubId/courts',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ClubCourtController)),
            ...(fetchMiddlewares<RequestHandler>(ClubCourtController.prototype.getClubCourts)),

            async function ClubCourtController_getClubCourts(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsClubCourtController_getClubCourts, request, response });

                const controller = new ClubCourtController();

              await templateService.apiHandler({
                methodName: 'getClubCourts',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsClubCourtController_createClubCourt: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                clubId: {"in":"path","name":"clubId","required":true,"dataType":"string"},
                createCourt: {"in":"body","name":"createCourt","required":true,"ref":"CourtCreateRequest"},
        };
        app.post('/v1/clubs/:clubId/courts',
            authenticateMiddleware([{"jwt":["CLUB_ADMIN"]}]),
            ...(fetchMiddlewares<RequestHandler>(ClubCourtController)),
            ...(fetchMiddlewares<RequestHandler>(ClubCourtController.prototype.createClubCourt)),

            async function ClubCourtController_createClubCourt(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsClubCourtController_createClubCourt, request, response });

                const controller = new ClubCourtController();

              await templateService.apiHandler({
                methodName: 'createClubCourt',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsClubController_getClubs: Record<string, TsoaRoute.ParameterSchema> = {
                city: {"in":"query","name":"city","dataType":"string"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/v1/clubs',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ClubController)),
            ...(fetchMiddlewares<RequestHandler>(ClubController.prototype.getClubs)),

            async function ClubController_getClubs(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsClubController_getClubs, request, response });

                const controller = new ClubController();

              await templateService.apiHandler({
                methodName: 'getClubs',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsClubController_createClub: Record<string, TsoaRoute.ParameterSchema> = {
                createClub: {"in":"body","name":"createClub","required":true,"ref":"ClubCreateRequest"},
        };
        app.post('/v1/clubs',
            authenticateMiddleware([{"jwt":["ADMIN"]}]),
            ...(fetchMiddlewares<RequestHandler>(ClubController)),
            ...(fetchMiddlewares<RequestHandler>(ClubController.prototype.createClub)),

            async function ClubController_createClub(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsClubController_createClub, request, response });

                const controller = new ClubController();

              await templateService.apiHandler({
                methodName: 'createClub',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsClubController_getClub: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/v1/clubs/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ClubController)),
            ...(fetchMiddlewares<RequestHandler>(ClubController.prototype.getClub)),

            async function ClubController_getClub(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsClubController_getClub, request, response });

                const controller = new ClubController();

              await templateService.apiHandler({
                methodName: 'getClub',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsClubController_updateClub: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                updateRequest: {"in":"body","name":"updateRequest","required":true,"ref":"UpdateClubRequest"},
        };
        app.patch('/v1/clubs/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ClubController)),
            ...(fetchMiddlewares<RequestHandler>(ClubController.prototype.updateClub)),

            async function ClubController_updateClub(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsClubController_updateClub, request, response });

                const controller = new ClubController();

              await templateService.apiHandler({
                methodName: 'updateClub',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsClubController_deleteClub: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/v1/clubs/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ClubController)),
            ...(fetchMiddlewares<RequestHandler>(ClubController.prototype.deleteClub)),

            async function ClubController_deleteClub(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsClubController_deleteClub, request, response });

                const controller = new ClubController();

              await templateService.apiHandler({
                methodName: 'deleteClub',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsBookingController_createBooking: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                createBooking: {"in":"body","name":"createBooking","required":true,"ref":"BookingCreateRequest"},
        };
        app.post('/v1/bookings',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(BookingController)),
            ...(fetchMiddlewares<RequestHandler>(BookingController.prototype.createBooking)),

            async function BookingController_createBooking(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsBookingController_createBooking, request, response });

                const controller = new BookingController();

              await templateService.apiHandler({
                methodName: 'createBooking',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsBookingController_getBookings: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                courtId: {"in":"query","name":"courtId","dataType":"string"},
                playerId: {"in":"query","name":"playerId","dataType":"string"},
                from: {"in":"query","name":"from","dataType":"datetime"},
                to: {"in":"query","name":"to","dataType":"datetime"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/v1/bookings',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(BookingController)),
            ...(fetchMiddlewares<RequestHandler>(BookingController.prototype.getBookings)),

            async function BookingController_getBookings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsBookingController_getBookings, request, response });

                const controller = new BookingController();

              await templateService.apiHandler({
                methodName: 'getBookings',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsBookingController_getBooking: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/v1/bookings/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(BookingController)),
            ...(fetchMiddlewares<RequestHandler>(BookingController.prototype.getBooking)),

            async function BookingController_getBooking(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsBookingController_getBooking, request, response });

                const controller = new BookingController();

              await templateService.apiHandler({
                methodName: 'getBooking',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsBookingController_updateBooking: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                updateRequest: {"in":"body","name":"updateRequest","required":true,"ref":"UpdateBookingRequest"},
        };
        app.patch('/v1/bookings/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(BookingController)),
            ...(fetchMiddlewares<RequestHandler>(BookingController.prototype.updateBooking)),

            async function BookingController_updateBooking(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsBookingController_updateBooking, request, response });

                const controller = new BookingController();

              await templateService.apiHandler({
                methodName: 'updateBooking',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsBookingController_deleteBooking: Record<string, TsoaRoute.ParameterSchema> = {
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/v1/bookings/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(BookingController)),
            ...(fetchMiddlewares<RequestHandler>(BookingController.prototype.deleteBooking)),

            async function BookingController_deleteBooking(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsBookingController_deleteBooking, request, response });

                const controller = new BookingController();

              await templateService.apiHandler({
                methodName: 'deleteBooking',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_register: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"ref":"RegisterRequest"},
        };
        app.post('/v1/auth/register',
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.register)),

            async function AuthController_register(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_register, request, response });

                const controller = new AuthController();

              await templateService.apiHandler({
                methodName: 'register',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_login: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"ref":"LoginRequest"},
        };
        app.post('/v1/auth/login',
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.login)),

            async function AuthController_login(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_login, request, response });

                const controller = new AuthController();

              await templateService.apiHandler({
                methodName: 'login',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_refresh: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"ref":"RefreshRequest"},
        };
        app.post('/v1/auth/refresh',
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.refresh)),

            async function AuthController_refresh(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_refresh, request, response });

                const controller = new AuthController();

              await templateService.apiHandler({
                methodName: 'refresh',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_logout: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"body","name":"request","required":true,"ref":"RefreshRequest"},
        };
        app.post('/v1/auth/logout',
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.logout)),

            async function AuthController_logout(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_logout, request, response });

                const controller = new AuthController();

              await templateService.apiHandler({
                methodName: 'logout',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 204,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function authenticateMiddleware(security: TsoaRoute.Security[] = []) {
        return async function runAuthenticationMiddleware(request: any, response: any, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            // keep track of failed auth attempts so we can hand back the most
            // recent one.  This behavior was previously existing so preserving it
            // here
            const failedAttempts: any[] = [];
            const pushAndRethrow = (error: any) => {
                failedAttempts.push(error);
                throw error;
            };

            const secMethodOrPromises: Promise<any>[] = [];
            for (const secMethod of security) {
                if (Object.keys(secMethod).length > 1) {
                    const secMethodAndPromises: Promise<any>[] = [];

                    for (const name in secMethod) {
                        secMethodAndPromises.push(
                            expressAuthenticationRecasted(request, name, secMethod[name], response)
                                .catch(pushAndRethrow)
                        );
                    }

                    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

                    secMethodOrPromises.push(Promise.all(secMethodAndPromises)
                        .then(users => { return users[0]; }));
                } else {
                    for (const name in secMethod) {
                        secMethodOrPromises.push(
                            expressAuthenticationRecasted(request, name, secMethod[name], response)
                                .catch(pushAndRethrow)
                        );
                    }
                }
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            try {
                request['user'] = await Promise.any(secMethodOrPromises);

                // Response was sent in middleware, abort
                if (response.writableEnded) {
                    return;
                }

                next();
            }
            catch(err) {
                // Show most recent error as response
                const error = failedAttempts.pop();
                error.status = error.status || 401;

                // Response was sent in middleware, abort
                if (response.writableEnded) {
                    return;
                }
                next(error);
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        }
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
