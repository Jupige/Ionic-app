import {DxDataGridComponent} from 'devextreme-angular';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, AfterViewInit, ViewChild } from '@angular/core';
import { NavController } from 'ionic-angular';
import { AboutService } from './services/about.service';
import { Deferred } from 'jquery';

@Component({
  selector: 'page-about',
  templateUrl: 'about.html',
  providers: [AboutService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutPage implements OnInit, AfterViewInit {

  @ViewChild(DxDataGridComponent) dg: DxDataGridComponent;
  datas: any[] = [];
  columns: any[];
  storageKeys: string[] = ['Jupige', 'Jupige0', 'Jupige1'];
  storageKey: string = this.storageKeys[0];
  storageType: string = 'custom';
  enabledLoading = true;

  constructor(public navCtrl: NavController, private sev: AboutService, private cd: ChangeDetectorRef) {

  }

  ngOnInit(): void {
    //  this.columns = ['name','age']
    // this.datas = [
    //   {
    //     name: 'Jupige-0',
    //     age: 25,
    //   },
    //   {
    //     name: 'Jupige-1',
    //     age: 24,
    //   },
    //   {
    //     name: 'Jupige-2',
    //     age: 23,
    //   }
    // ]
    this.initDatas();
  }

  customLoad() {
    let gridState = JSON.parse(localStorage.getItem(this.storageKey));
    console.log('========Load============');
    console.log(gridState);

    return Deferred().resolve(gridState);
  }

  customSave(gridState: Object) {
    console.log('========Save============');
    console.log(gridState);
    setTimeout(() => localStorage.setItem(this.storageKey, JSON.stringify(gridState)));
  }

  ngAfterViewInit(): void {

  }

  private initDatas() {
    let isInitColumns = false;
    let su = this.sev.getPersionsAsync()
      .subscribe(p => {
        if (!isInitColumns) {
          this.columns = Object.keys(p).map(k => {
            let r = {
              dataField: k,
              dataType: (typeof p[k]),
              allowHeaderFiltering: true,
            }
            return r;
          });
        }

        if (this.datas.length > 4) {
          su.unsubscribe();
        } else {
          this.datas.push(p);
          this.update();
        }
      });
  }

  private switchUser() {
    // this.dg.instance.beginCustomLoading();
  }

  private changeFirstData() {
    console.log('changeFirstData');
    this.datas[0][this.columns[0].dataField] = new Date().toString();
    this.update();
  }

  private addOneData() {
    this.datas.unshift(this.datas[0]);
     this.update();
  }

  private removeOneData() {
    this.datas.splice(0, 1);
     this.update();
  }

  private update() {
    this.cd.markForCheck();
  }
}
