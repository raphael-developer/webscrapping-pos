import { createRouter, createWebHistory } from "vue-router";
import Home from "@/views/Home.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
    meta: {
      title: "Cursos - Faculdade Única",
    },
  },
  {
    path: "/cursos",
    name: "AllCourses",
    component: () => import("@/views/AllCourses.vue"),
    meta: {
      title: "Todos os Cursos",
    },
  },
  {
    path: "/curso/:id",
    name: "CourseDetail",
    component: () => import("@/views/CourseDetail.vue"),
    meta: {
      title: "Detalhes do Curso",
    },
  },
  {
    path: "/categoria/:category",
    name: "CategoryCourses",
    component: () => import("@/views/CategoryCourses.vue"),
    meta: {
      title: "Cursos por Categoria",
    },
  },
  {
    path: "/admin",
    name: "Admin",
    component: () => import("@/views/Admin.vue"),
    meta: {
      title: "Administração",
    },
  },
  {
    path: "/monitor",
    name: "ScrapingMonitor",
    component: () => import("@/views/ScrapingMonitor.vue"),
    meta: {
      title: "Monitor de Scraping",
    },
  },
  {
    path: "/comparison",
    name: "WooCommerceComparison",
    component: () => import("@/views/WooCommerceComparison.vue"),
    meta: {
      title: "Comparação WooCommerce",
    },
  },
  {
    path: "/registration",
    name: "CourseRegistration",
    component: () => import("@/views/CourseRegistration.vue"),
    meta: {
      title: "Cadastro de Cursos",
    },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/views/NotFound.vue"),
    meta: {
      title: "Página não encontrada",
    },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0, left: 0 };
    }
  },
});

// Navigation guards
router.beforeEach((to, from, next) => {
  // Set page title
  document.title = to.meta.title || "Faculdade Única";
  next();
});

export default router;
