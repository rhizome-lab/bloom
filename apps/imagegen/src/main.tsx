// oxlint-disable-next-line no-unassigned-import
import "@viwo/shared/index.css";
import App from "./App";
import { render } from "solid-js/web";

const root = document.querySelector("#root");

if (root) {
  render(() => <App />, root);
}
