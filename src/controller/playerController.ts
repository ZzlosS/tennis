import { Player } from "../entities/player";
import PlayerRepository from "../repositories/playerRepository";
const jwt = require("jsonwebtoken");
import express, { Request, Response } from "express";
import PlayerDto from "../dtos/playerDto";

export default class PlayerController {
  repository: PlayerRepository;

  constructor() {
    this.repository = new PlayerRepository();
  }

  async register(req: Request, res: Response) {
    try {
      const { firstName, lastName, email, password, address, city } = req.body as PlayerDto;

      // Validate user input
      if (!(email && password && firstName && lastName)) {
        res.status(400).send("All input is required");
      }

      const existingUser = await this.repository.findByEmail(email);
      if (existingUser) {
        return res.status(409).send("User already exist!");
      }

      const encryptedPassword = password;
      const user = await this.repository.createAndSave({
        firstName: firstName,
        lastName: lastName,
        password: encryptedPassword,
        email: email,
        city: city,
        address: address,
      });

      console.log(user.entityId);

      // Create token
      const token = jwt.sign({ user_id: user.entityId, email }, process.env.TOKEN_KEY, {
        expiresIn: "2h",
      });
      console.log("🚀 ~ UserController ~ token", token);

      return res.status(201).json({
        token: token,
        email: user.email,
      });
    } catch (error) {
      console.log("error", error);
      return res.status(404);
    }
  }
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Validate user input
      if (!(email && password)) {
        res.status(400).send("All input is required");
      }

      const player = await this.repository.findByEmail(email);

      if (!player) {
        return res.status(404);
      }

      if (player && password == player.password) {
        // Create token
        const token = jwt.sign({ user_id: player.entityId, email }, process.env.TOKEN_KEY, {
          expiresIn: "2h",
        });

        return res.status(201).json({
          token: token,
          email: player.email,
        });
      } else {
        res.status(400).send("Invalid Credentials");
      }
    } catch (error) {
      console.log("error", error);
      return res.status(404);
    }
  }
}
