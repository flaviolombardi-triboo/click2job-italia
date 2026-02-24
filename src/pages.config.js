/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import CercaPerCitta from './pages/CercaPerCitta';
import DettaglioOfferta from './pages/DettaglioOfferta';
import DettaglioProfessione from './pages/DettaglioProfessione';
import ElencoProfessioni from './pages/ElencoProfessioni';
import GestisciFeed from './pages/GestisciFeed';
import Home from './pages/Home';
import PubblicaOfferta from './pages/PubblicaOfferta';
import RisultatiRicerca from './pages/RisultatiRicerca';
import Stipendi from './pages/Stipendi';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CercaPerCitta": CercaPerCitta,
    "DettaglioOfferta": DettaglioOfferta,
    "DettaglioProfessione": DettaglioProfessione,
    "ElencoProfessioni": ElencoProfessioni,
    "GestisciFeed": GestisciFeed,
    "Home": Home,
    "PubblicaOfferta": PubblicaOfferta,
    "RisultatiRicerca": RisultatiRicerca,
    "Stipendi": Stipendi,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};