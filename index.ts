import { registerRootComponent } from "expo";
import { Platform } from "react-native";
if (typeof global !== "undefined") {
  (global as any).Platform = Platform;
}
import App from "./App";
registerRootComponent(App);
