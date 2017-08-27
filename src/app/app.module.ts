import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { MyApp } from './app.component';

import { AboutPage } from '../pages/about/about.new';
import { ContactPage } from '../pages/contact/contact';
import { HomePage } from '../pages/home/home';
import { TabsPage } from '../pages/tabs/tabs';

import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

//Imports a separate module
import { DxDataGridModule } from 'devextreme-angular/ui/data-grid';
import { OrderItemValuePipe, OrderItemClassPipe } from "../pages/about/pipe/order.cell.pipe.new";
import { UserListPage } from "../pages/user/user-list/user-list";
import { GoldenLayoutService } from "./golden-layout.service";
import { CommonModule } from "@angular/common";
import { GoldenLayoutDirective } from "../pages/layout/layout.directive";
import { GoldenLayoutComponent } from "./golden.base";

@NgModule({
  declarations: [
     GoldenLayoutDirective,
    MyApp,
    AboutPage,
    ContactPage,
    HomePage,
    TabsPage,
    OrderItemValuePipe,
    OrderItemClassPipe,
    UserListPage,
    GoldenLayoutComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    IonicModule.forRoot(MyApp),
    DxDataGridModule
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    AboutPage,
    ContactPage,
    HomePage,
    TabsPage,
    UserListPage,
  ],
  providers: [
    StatusBar,
    SplashScreen,
    { provide: ErrorHandler, useClass: IonicErrorHandler }
  ]
})
export class AppModule {
  constructor() {
    GoldenLayoutService.overriedGoldenLayout();
  }
}
