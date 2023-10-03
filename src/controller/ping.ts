import { Get, Route, Tags } from "tsoa";

interface PingResponse {
  message: string;
}

@Tags("Ping")
@Route("ping")
export default class PingController {
  @Get("/")
  public async getMessage(): Promise<PingResponse> {
    return {
      message: "MRK",
    };
  }
}