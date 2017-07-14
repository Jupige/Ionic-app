import { DxDataGridComponen t } from 'devextreme-angular';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, AfterViewInit, ViewChild } from '@angular/core';
import { NavController } from 'ionic-angular';
import { AboutService } from './services/about.service';
import { Deferred } from 'jquery';
import { MakeMarketOrder } from "./model/make-market";

@Component({
  selector: 'page-about',
  templateUrl: 'about.html',
  providers: [AboutService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutPage implements OnInit, AfterViewInit {

  @ViewChild(DxDataGridComponent) dg: DxDataGridComponent;
  orders: MakeMarketOrder[] = [];

  constructor(public navCtrl: NavController, private sev: AboutService, private cd: ChangeDetectorRef) {

  }

  ngOnInit(): void {
    this.initDatas();
  }


  ngAfterViewInit(): void {

  }

  private initDatas() {
    let isInitColumns = false;
    let su = this.sev.getPersionsAsync()
      .subscribe(p => {
        if (this.orders.length > 4) {
          su.unsubscribe();
        } else {
          this.orders.push(MakeMarketOrder.generate());
          this.update();
        }
      });
  }

  private changeFirstData() {
    console.log('changeFirstData');
    let od = MakeMarketOrder.generate();
    console.log(od);
    this.orders[0].updateOrderBySystem(od);
    this.update();
  }

  private addOneData() {
    console.log('addOneData');
    let od = MakeMarketOrder.generate();
    console.log(od);
    this.orders.unshift(od);
    this.update();
  }

  private removeOneData() {
    this.orders.splice(0, 1);
    this.update();
  }

  private update() {
    this.cd.markForCheck();
  }
}