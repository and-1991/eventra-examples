import { trackFeature } from "../tracker";

export default {
  setup() {
    function handleClick() {
      trackFeature("vue_external_script_click");
    }
    return { handleClick };
  },
};
