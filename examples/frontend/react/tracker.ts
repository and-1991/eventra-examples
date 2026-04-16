import { Eventra } from "@eventra_dev/eventra-sdk";
export const tracker=new Eventra({apiKey:"test",baseUrl:"http://localhost:4000"});
export const trackFeature=(n)=>tracker.track(n,{userId:"demo"});
