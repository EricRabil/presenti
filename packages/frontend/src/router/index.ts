import Vue from "vue";
import VueRouter, { RouteConfig } from "vue-router";
import Home from "../views/Home.vue";
import Login from "@/views/Login.vue";
import Settings from "@/views/Settings.vue";
import store from "@/store";

const Admin = () => import("@/views/Admin.vue");

Vue.use(VueRouter);

const routes: RouteConfig[] = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/developer",
    name: "Developer",
    component: () => import("../views/Developer.vue"),
    children: [{
      name: "builder",
      path: "builder"
    }, {
      name: "ws-presence-api",
      path: "presence/ws"
    }, {
      name: "rest-presence-api",
      path: "presence/rest"
    }, {
      name: "ws-remote-api",
      path: "remote/ws"
    }, {
      name: "rest-remote-api",
      path: "remote/rest"
    }]
  },
  {
    path: "/login",
    name: "Login",
    component: Login,
  },
  {
    path: "/settings",
    name: "Settings",
    component: Settings,
    children: [{
      name: "Settings",
      path: ":section"
    }]
  },
  {
    path: "/admin",
    name: "Admin",
    component: Admin
  }
];

const router = new VueRouter({
  mode: "history",
  base: process.env.BASE_URL,
  routes,
});

export default router;
