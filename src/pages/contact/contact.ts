import { Component, OnInit, ElementRef, SkipSelf } from '@angular/core';
import { NavController } from 'ionic-angular';
import { GoldenLayoutService } from "../../app/golden-layout.service";
import { UserListPage } from "../user/user-list/user-list";
import { GoldenLayoutComponent } from "../../app/golden.base";

@Component({
  selector: 'page-contact',
  templateUrl: 'contact.1.html',
  providers: [GoldenLayoutService]
})
export class ContactPage {
  componentTypes = [{
    name: 'UserListPage',
    type: UserListPage
  }, {
    name: 'UserListPage2',
    type: UserListPage
  }, {
    name: 'UserListPage3',
    type: UserListPage
  }];

  name = 'UserListPage';
  config = {
    content: [{
      width: 200,
      height: 200,
      type: 'row',
      content: [{
        type: 'component',
        title: 'UserListPage',
        componentName: 'UserListPage',
      }, {
        type: 'column',
        content: [{
          type: 'component',
          title: 'UserListPage2',
          componentName: 'UserListPage2',
        }, {
          type: 'component',
          title: 'UserListPage3',
          componentName: 'UserListPage3',
        }]
      }]
    }]
  };
  constructor(public navCtrl: NavController,
    layouSev: GoldenLayoutService,
    ele: ElementRef,
    @SkipSelf() parent: ElementRef) {
    // super(ele, layouSev, parent);
    console.log(`${this.constructor.name} constructor`);
  }

  // ngOnInit(): void {
  //   this.layoutSev.config(this.constructor.name, {
  //     content: [{
  //       type: 'row',
  //       content: [{
  //         type: 'component',
  //         title: 'Selected User',
  //         componentName: 'UserListPage',
  //         componentState: {
  //           module: 'userdetails',
  //           templateId: 'userDetailTemplate'
  //         }
  //       }, {
  //         type: 'column',
  //         content: [{
  //           type: 'component',
  //           title: 'Selected User2',
  //           componentName: 'UserListPage',
  //           componentState: { label: 'B' }
  //         }, {
  //           type: 'component',
  //           title: 'Selected User3',
  //           componentName: 'UserListPage',
  //           componentState: { label: 'C' }
  //         }]
  //       }]
  //     }]
  //   }, this.ele.nativeElement);
  //   this.layoutSev.register({ name: 'UserListPage', type: UserListPage });
  //   this.layoutSev.init();

  //   console.log(`${this.constructor.name} ngOnInit`);
  // }

  // ngOnDestroy(): void {
  //   console.log(`${this.constructor.name} ngOnDestroy`);
  // }

}
