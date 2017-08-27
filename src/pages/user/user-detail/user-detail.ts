
import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { NavController } from 'ionic-angular';

@Component({
    selector: 'page-home',
    templateUrl: 'user-detail.html'
})
export class HomePage implements OnInit {
    user: any;

    constructor(public navCtrl: NavController, private container, private state: any, private cd: ChangeDetectorRef) {

    }

    ngOnInit() {
        this.user = this.state.user || null;
        this.container.layoutManager.eventHub.on('userSelected', (user) => {
            this.user = user;
            this.container.extendState({ user: user });
            this.cd.markForCheck();
        });
    }
}

