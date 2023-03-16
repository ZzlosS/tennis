import { Player } from "../entities/player";
import PlayerRepository from "../repositories/playerRepository";
import express, { Request, Response } from "express";

export default class PlayerController {
  repository: PlayerRepository;

  constructor() {
    this.repository = new PlayerRepository();
  }

  async register(req: Request, res: Response) {

  }
  async login(req: Request, res: Response) {

  }
}