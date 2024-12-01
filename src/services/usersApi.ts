import { UserInput, UserOutput } from "../types/user";

export default abstract class Service {
  static backendBaseUrl = "http://192.168.0.213:3000";

  static defaultUserOutput = {
    id: 0,
    name: "undefined",
    email: "undefined",
    login: "undefined",
    password: "undefined",
    city: "undefined",
  };

  static async AddUser(user: UserInput): Promise<UserOutput> {
    try {
      return await fetch(`${this.backendBaseUrl}/users`, {
        body: JSON.stringify(user),
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).then(async (response) => {
        console.log("AddUser");
        return await response.json();
      });
    } catch (ex) {
      console.log("error AddUser", (ex as Error).message);
      return this.defaultUserOutput;
    }
  }

  static async ListUsers(): Promise<UserOutput[]> {
    try {
      return await fetch(`${this.backendBaseUrl}/users`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }).then(async (response) => {
        console.log("ListUsers");
        return (await response.json()) as UserOutput[];
      });
    } catch (ex) {
      console.log("error ListUsers", (ex as Error).message);
      return [this.defaultUserOutput];
    }
  }

  static async GetUser(userId: number): Promise<UserOutput> {
    try {
      return await fetch(`${this.backendBaseUrl}/users/${userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }).then(async (response) => {
        console.log("GetUser");
        return response.json();
      });
    } catch (ex) {
      console.log("error GetUser", (ex as Error).message);
      return this.defaultUserOutput;
    }
  }

  static async UpdateUser(user: UserOutput): Promise<string> {
    try {
      return await fetch(`${this.backendBaseUrl}/users/${user.id}`, {
        body: JSON.stringify(user),
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      }).then(async (response) => {
        console.log("UpdateUser");
        return response.json().then((response) => {
          return response["message"];
        });
      });
    } catch (ex) {
      console.log("error UpdateUser", (ex as Error).message);
      return (ex as Error).message;
    }
  }

  static async DeleteUser(userId: number): Promise<string> {
    try {
      return await fetch(`${this.backendBaseUrl}/users/${userId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }).then(async (response) => {
        console.log("DeleteUser");
        return response.json().then((response) => {
          return response["message"];
        });
      });
    } catch (ex) {
      console.log("error DeleteUser", (ex as Error).message);
      return (ex as Error).message;
    }
  }
}
