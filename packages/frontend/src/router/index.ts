import Vue from "vue";
import VueRouter, { RouteConfig } from "vue-router";
import Home from "../views/Home.vue";
import Login from "@/views/Login.vue";
import Settings from "@/views/Settings.vue";
import store from "@/store";

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
    component: () => import("../views/Developer.vue")
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
      path: "/settings/:section"
    }]
  }
];

const router = new VueRouter({
  mode: "history",
  base: process.env.BASE_URL,
  routes,
});

/** Ensures the user is logged in before accessing the website */
router.beforeEach((to, from, next) => {
  if (to.path !== "/login" && !store.getters["user/isAuthenticated"]) {
    store.commit("router/updateLoginRedirect", to.path);
    next("/login");
  } else {
    next();
  }
});

export default router;
